document.addEventListener("DOMContentLoaded", () => {
  const optionsButton = document.getElementById("optionsButton");
  const apiKeyStatusDiv = document.getElementById("apiKeyStatus");

  if (!optionsButton || !apiKeyStatusDiv) {
    console.error("팝업 HTML 요소를 찾을 수 없습니다.");
    return;
  }

  // 옵션 버튼 클릭 시
  optionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // API 키 상태 확인 및 표시
  chrome.storage.local.get(["apiKey"], (result) => {
    if (result.apiKey) {
      apiKeyStatusDiv.textContent = "API 키 설정됨";
      apiKeyStatusDiv.style.color = "green";
    } else {
      apiKeyStatusDiv.textContent = "API 키 필요";
      apiKeyStatusDiv.style.color = "red";
    }
  });
});

// 더 이상 content script로부터 상태 메시지를 받을 필요 없음
