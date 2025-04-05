const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveButton");
const statusDiv = document.getElementById("status");

// 페이지 로드 시 저장된 API 키 불러오기
function restoreOptions() {
  chrome.storage.local.get(["apiKey"], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
}

// API 키 저장 함수
function saveOptions() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    statusDiv.textContent = "API 키를 입력해주세요.";
    statusDiv.style.color = "red";
    return;
  }

  chrome.storage.local.set({ apiKey: apiKey }, () => {
    console.log("API 키가 저장되었습니다:", apiKey.substring(0, 10) + "..."); // 전체 키 로그 출력 방지
    statusDiv.textContent = "API 키가 저장되었습니다!";
    statusDiv.style.color = "green";
    setTimeout(() => {
      statusDiv.textContent = ""; // 잠시 후 메시지 지우기
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
saveButton.addEventListener("click", saveOptions);
