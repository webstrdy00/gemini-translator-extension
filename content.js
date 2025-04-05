console.log(
  "Gemini 번역기 content.js 로드됨 - 선택 영역 처리 전용 (서식 유지 - PRE 태그 사용)"
);

/**
 * 현재 선택된 영역의 내용을 주어진 텍스트로 교체합니다.
 * <pre> 태그와 CSS를 사용하여 원본과 유사한 공백/줄바꿈 서식을 유지합니다.
 * @param {string} translatedText - 선택 영역을 대체할 번역된 텍스트.
 */
function replaceSelectionWithText(translatedText) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    console.warn("교체할 선택 영역을 찾을 수 없습니다.");
    alert(`번역 결과 (선택 영역 교체 실패):\n${translatedText}`);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents(); // 기존 내용 삭제

  // --- innerText를 사용하여 삽입 시도 ---

  // 1. 번역된 내용을 담을 새 div 요소 생성
  const contentWrapper = document.createElement("div");

  // 2. innerText 속성에 번역된 텍스트 할당.
  //    브라우저는 할당 시 \n 문자를 기반으로 렌더링 시 줄바꿈을 시도합니다.
  //    (이것이 white-space CSS나 <br>보다 우선 적용될 수 있음)
  contentWrapper.innerText = translatedText;

  // 3. 필요하다면 wrapper에 스타일 적용 (선택적, 예: 폰트 상속)
  //    innerText 자체는 스타일 정보를 가지지 않으므로, 컨테이너에 스타일 적용
  contentWrapper.style.whiteSpace = "pre-wrap"; // 여전히 추가해주는 것이 좋음
  contentWrapper.style.margin = "0";
  contentWrapper.style.padding = "0";
  contentWrapper.style.border = "none";
  contentWrapper.style.background = "transparent";
  contentWrapper.style.fontFamily = "inherit";
  contentWrapper.style.fontSize = "inherit";
  contentWrapper.style.lineHeight = "inherit";
  contentWrapper.style.color = "inherit";

  // 4. 생성된 wrapper div를 선택된 range에 삽입
  range.insertNode(contentWrapper);

  // --- innerText 삽입 끝 ---

  console.log(
    "선택 영역이 번역된 텍스트(innerText 사용, 서식 유지 시도)로 교체되었습니다."
  );
}

// --- 메시지 리스너 (Background로부터 번역 결과 수신) ---
// 이 부분은 이전과 동일하게 유지합니다.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("content.js 메시지 수신:", request.action);

  if (request.action === "replaceSelection") {
    console.log("--- Content Script Received Text ---");

    console.log(JSON.stringify(request.translatedText));
    console.log("--- Content Script Received Text End ---");
    if (
      request.translatedText !== undefined &&
      request.translatedText !== null
    ) {
      replaceSelectionWithText(request.translatedText);
      sendResponse({ status: "selection_replaced_with_pre_format" }); // 상태 메시지 약간 변경
    } else {
      console.error("replaceSelection 메시지에 translatedText가 없습니다.");
      sendResponse({ status: "error", message: "No translated text received" });
    }
    return false;
  }
});
