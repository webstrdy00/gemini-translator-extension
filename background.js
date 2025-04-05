// API 키 로드 함수 (비동기)
async function getApiKey() {
  const result = await chrome.storage.local.get(["apiKey"]);
  return result.apiKey;
}

/**
 * 주어진 텍스트를 Gemini API를 사용하여 한국어로 번역합니다. (서식 유지 시도)
 * @param {string} textToTranslate - 번역할 원본 텍스트.
 * @returns {Promise<string>} 번역된 텍스트를 resolve하는 Promise. 오류 발생 시 reject.
 */
async function translateTextWithGemini(textToTranslate) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set it in the options.");
  }

  // 입력 텍스트의 앞뒤 공백 유지를 위해 trim() 제거
  if (!textToTranslate) {
    console.log("번역할 텍스트가 비어있어 건너<0xEB><0x9B><0x84>니다.");
    return "";
  }

  console.log(
    "Gemini 번역 요청 (서식 유지 시도):",
    `"${textToTranslate.substring(0, 50)}..."`
  );

  // --- 프롬프트 수정: 서식 유지 명시 ---
  const prompt = `Please translate the following text into Korean.
IMPORTANT INSTRUCTION: Preserve the original line breaks, indentation, and spacing exactly as they appear in the input text. Do not add any extra characters or formatting like '---' separators. Just provide the translated text with the original formatting.

Input Text to Translate:
${textToTranslate}`;
  // --- 프롬프트 수정 끝 ---

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }], // 수정된 프롬프트 사용
    generationConfig: { candidateCount: 1 },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorBodyText = "";
    try {
      errorBodyText = await response.text();
      const errData = JSON.parse(errorBodyText);
      console.error("Gemini API 오류 응답 (JSON):", response.status, errData);
      const message =
        errData.error?.message || `API Error (${response.status})`;
      if (
        message.includes("API key not valid") ||
        message.includes("API_KEY_INVALID")
      ) {
        throw new Error("API key not valid. Please check options.");
      } else if (response.status === 429) {
        throw new Error(
          "API rate limit exceeded (429). Please wait and try again."
        );
      }
      throw new Error(message);
    } catch (jsonParseError) {
      console.error(
        "Gemini API 오류 응답 (Text):",
        response.status,
        errorBodyText.substring(0, 500)
      );
      throw new Error(
        `API request failed with status ${
          response.status
        }. Response: ${errorBodyText.substring(0, 100)}...`
      );
    }
  }

  const data = await response.json();

  // 결과 파싱
  let translatedText = "";
  let blockReason = null;
  let finishReason = null;

  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    finishReason = candidate.finishReason;
    if (candidate.content?.parts?.length > 0) {
      translatedText = candidate.content.parts[0].text;
    }
  } else {
    blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      console.warn("Gemini API 콘텐츠 차단:", blockReason);
      throw new Error(`Content blocked by safety filter: ${blockReason}`);
    }
  }

  if (finishReason && finishReason !== "STOP") {
    console.warn(`Gemini API 비정상 종료: ${finishReason}.`);
    if (finishReason === "SAFETY") {
      throw new Error(`Content blocked due to finish reason: ${finishReason}`);
    }
  }

  if (!translatedText && !blockReason && finishReason !== "SAFETY") {
    console.warn("예상치 못한 Gemini API 응답 (번역 결과 없음):", data);
    throw new Error("Could not parse translation from API response.");
  }

  console.log("--- API Raw Response Text ---");
  // JSON.stringify를 사용하면 \n 같은 특수문자가 \\n으로 보여 명확하게 확인 가능
  console.log(JSON.stringify(translatedText));
  console.log("--- API Raw Response Text End ---");

  console.log(
    "번역 결과 (서식 유지 시도):",
    translatedText ? `"${translatedText.substring(0, 100)}..."` : "(빈 결과)"
  );
  // 최종 반환 시 trim() 제거하여 앞뒤 공백/줄바꿈 유지
  return translatedText;
}

// --- 확장 프로그램 설치/업데이트 시 실행 ---
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Gemini 선택 번역기 설치/업데이트됨:", details.reason);

  // Context Menu 생성
  chrome.contextMenus.create({
    id: "translateSelectedTextContextMenu",
    title: "선택 텍스트 한국어로 번역 (Gemini)",
    contexts: ["selection"],
  });

  // 최초 설치 시 API 키 없으면 옵션 페이지 열기
  if (details.reason === "install") {
    getApiKey().then((apiKey) => {
      if (!apiKey) {
        console.log("API 키가 설정되지 않아 옵션 페이지를 엽니다.");
        chrome.runtime.openOptionsPage();
      }
    });
  }
});

// --- Context Menu 클릭 이벤트 리스너 ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (
    info.menuItemId === "translateSelectedTextContextMenu" &&
    tab?.id &&
    info.selectionText
  ) {
    const selectedText = info.selectionText; // 원본 선택 텍스트
    console.log(
      `우클릭 메뉴 번역 요청 (서식 유지 시도): "${selectedText.substring(
        0,
        50
      )}..."`
    );

    try {
      // 1. 백그라운드에서 직접 번역 실행 (서식 유지 시도 버전)
      const translatedText = await translateTextWithGemini(selectedText);

      // 2. content.js 주입 및 결과 전송
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      // console.log("content.js 주입됨."); // 로그 간소화

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "replaceSelection",
        translatedText: translatedText, // 번역된 텍스트 (서식 포함 가능성 있음) 전달
      });
      console.log("Content script 응답:", response);
    } catch (error) {
      console.error("선택 번역 처리 중 오류:", error);
      // 오류 알림 (content script 통해 alert)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (msg) => alert(msg), // content script에서 alert 실행
          args: [`번역 오류: ${error.message}`],
        });
      } catch (injectionError) {
        console.error("오류 알림을 위한 스크립트 주입 실패:", injectionError);
      }
    }
  }
});

// 메시지 리스너 (선택적)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    // translateTextWithGemini 함수는 서식 유지를 시도함
    translateTextWithGemini(request.text)
      .then((translatedText) => {
        sendResponse({ translatedText: translatedText }); // 서식 포함된 텍스트 반환
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true; // 비동기 응답
  }
});

console.log(
  "Gemini 번역기 background.js 로드됨 (선택 번역 전용, 서식 유지 시도)"
);
