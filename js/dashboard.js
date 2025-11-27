function initializeDarkMode() {
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme") || "light";

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.checked = true;
  }

  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
    const currentTheme = document.body.classList.contains("dark-mode")
      ? "dark"
      : "light";
    localStorage.setItem("theme", currentTheme);
  });
}

initializeDarkMode();

// backend URL on Render
const BACKEND_URL = "https://ai-learning-backend2-1.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const studentNameElem = document.getElementById("welcome");
  const playlistInput = document.getElementById("playlistInput");
  const loadBtn = document.getElementById("loadBtn");
  const videoList = document.getElementById("videoList");
  const progressText = document.getElementById("progressText");
  const streakText = document.getElementById("streakText");
  const totalVideosSpan = document.getElementById("totalVideos");
  const estimatedDurationSpan = document.getElementById("estimatedDuration");
  const percentCompletedSpan = document.getElementById("percentCompleted");
  const completedHoursSpan = document.getElementById("completedHours");

  const userDropdownBtn = document.getElementById("userDropdownBtn");
  const userDropdown = document.querySelector(".user-dropdown");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const passwordField = document.getElementById("passwordField");
  const togglePassword = document.getElementById("togglePassword");
  const clearProgressBtn = document.getElementById("clearProgressBtn");

  const userHash = localStorage.getItem("userHash");
  const studentName = localStorage.getItem("studentName");
  const storedPassword = localStorage.getItem("userPassword") || "••••••••";

  if (!userHash || !studentName) {
    alert("Please login first.");
    window.location.href = "index.html";
    return;
  }
  if (studentNameElem) studentNameElem.textContent = `Welcome, ${studentName}`;
  if (userNameDisplay) userNameDisplay.textContent = studentName;
  if (passwordField) passwordField.value = storedPassword;

  userDropdownBtn.addEventListener("click", () => {
    userDropdown.classList.toggle("show");
  });
  window.addEventListener("click", (e) => {
    if (!userDropdown.contains(e.target) && !userDropdownBtn.contains(e.target))
      userDropdown.classList.remove("show");
  });
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userHash");
    localStorage.removeItem("studentName");
    localStorage.removeItem("userPassword");
    window.location.href = "index.html";
  });
  togglePassword.addEventListener("click", () => {
    if (passwordField.type === "password") {
      passwordField.type = "text";
      togglePassword.textContent = "Hide";
    } else {
      passwordField.type = "password";
      togglePassword.textContent = "Show";
    }
  });

  clearProgressBtn.addEventListener("click", () => {
    if (
      confirm(
        "🔄 Clear all progress?\n\nThis will:\n• Reset completion checkmarks\n• Reset streak to 0\n• Clear all feedback\n• Reset playlist\n\nContinue?"
      )
    ) {
      try {
        localStorage.removeItem(`completedVideos_${userHash}`);
        localStorage.removeItem(`lastCompletionDate_${userHash}`);
        localStorage.removeItem(`currentStreak_${userHash}`);
        localStorage.removeItem(`longestStreak_${userHash}`);
        localStorage.removeItem(`lectureFeedback_${userHash}`);
        localStorage.removeItem(`playlist_${userHash}`);

        document.querySelectorAll("input[type='checkbox']").forEach((cb) => {
          cb.checked = false;
        });

        videoDurationsInSeconds = [];
        feedbackState = {};

        progressText.textContent = "0%";
        streakText.textContent = "0 day streak";
        totalVideosSpan.textContent = "0";
        estimatedDurationSpan.textContent = "0";
        completedHoursSpan.textContent = "0";
        percentCompletedSpan.textContent = "0%";
        videoList.innerHTML = "";
        playlistInput.value = "";

        const circle = document.getElementById("progressCircle");
        if (circle) {
          circle.style.strokeDashoffset = 219.91;
        }

        alert("✅ All progress cleared successfully!");

        setTimeout(() => {
          window.location.reload();
        }, 300);
      } catch (error) {
        alert("❌ Error clearing data: " + error.message);
      }
    }
  });

  const API_KEY = "AIzaSyBb5_z_0rWjshlEgHZMtUSoboPfCiDjDYs";

  function loadFeedbackState() {
    const stored = localStorage.getItem(`lectureFeedback_${userHash}`);
    return stored ? JSON.parse(stored) : {};
  }
  function saveFeedbackState(state) {
    localStorage.setItem(`lectureFeedback_${userHash}`, JSON.stringify(state));
  }
  let feedbackState = loadFeedbackState();

  let videoDurationsInSeconds = [];
  let lectureTitles = [];

  loadBtn.addEventListener("click", async () => {
    const url = playlistInput.value.trim();
    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      alert("❌ Please enter a valid YouTube playlist link!");
      return;
    }
    savePlaylist();
    videoList.innerHTML = "<li>Loading videos...</li>";

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`
      );
      const data = await response.json();

      if (data.error) {
        console.error("YouTube API error (playlistItems):", data.error);
        videoList.innerHTML =
          "<li>❌ YouTube API error. Check console (maybe key/quota).</li>";
        return;
      }

      if (!data.items || data.items.length === 0) {
        videoList.innerHTML = "<li>❌ No videos found in this playlist!</li>";
        return;
      }

      videoList.innerHTML = "";
      const totalVideos = data.items.length;
      totalVideosSpan.textContent = totalVideos;

      lectureTitles = data.items.map((item, index) => {
        const rawTitle = item.snippet.title || `Lecture ${index + 1}`;
        return rawTitle;
      });

      const videoIds = data.items
        .map((item) => item.snippet.resourceId.videoId)
        .join(",");
      const durationsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${API_KEY}`
      );
      const durationsData = await durationsResponse.json();

      if (durationsData.error) {
        console.error("YouTube API error (videos):", durationsData.error);
        videoList.innerHTML =
          "<li>❌ Failed to load video durations. Check console.</li>";
        return;
      }

      let totalDurationSec = 0;
      videoDurationsInSeconds = durationsData.items.map((item) => {
        const seconds = parseISO8601DurationToSeconds(
          item.contentDetails.duration
        );
        totalDurationSec += seconds;
        return seconds;
      });
      const totalDurationHours = (totalDurationSec / 3600).toFixed(2);
      estimatedDurationSpan.textContent = totalDurationHours;

      data.items.forEach((item, index) => {
        const title = lectureTitles[index];
        const videoId = item.snippet.resourceId.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const li = document.createElement("li");
        li.classList.add("lecture-item");
        li.innerHTML = `
          <div class="lecture-left">
            <input type="checkbox" id="video-${index}" />
            <label for="video-${index}">
              <a href="${videoUrl}" target="_blank">${title}</a>
            </label>
          </div>
          <div class="lecture-right">
            <button class="feedback-btn" id="understood-${index}" type="button" title="Understood 👍">👍</button>
            <button class="feedback-btn" id="confused-${index}" type="button" title="Confused 😕">😕</button>
          </div>
        `;

        if (feedbackState[index] === "understood") {
          li.style.backgroundColor = "#e6ffe6";
        } else if (feedbackState[index] === "confused") {
          li.style.backgroundColor = "#fff5e6";
        }

        li.querySelector(`#understood-${index}`).addEventListener(
          "click",
          () => {
            if (feedbackState[index] === "understood") {
              delete feedbackState[index];
              li.style.backgroundColor = "";
            } else {
              feedbackState[index] = "understood";
              li.style.backgroundColor = "#e6ffe6";
            }
            saveFeedbackState(feedbackState);
          }
        );

        li.querySelector(`#confused-${index}`).addEventListener("click", () => {
          if (feedbackState[index] === "confused") {
            delete feedbackState[index];
            li.style.backgroundColor = "";
          } else {
            feedbackState[index] = "confused";
            li.style.backgroundColor = "#fff5e6";
          }
          saveFeedbackState(feedbackState);
        });

        li.querySelector("input").addEventListener("change", () => {
          updateProgress();
          saveProgress();
        });

        videoList.appendChild(li);
      });

      loadProgressFromStorage();
      updateProgress();
    } catch (error) {
      console.error("Playlist load error:", error);
      videoList.innerHTML =
        "<li>❌ Failed to load playlist (see console).</li>";
    }
  });

  function extractPlaylistId(url) {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function getTodayDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  }

  function parseISO8601DurationToSeconds(isoDuration) {
    let totalSeconds = 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);
    if (matches[1]) totalSeconds += parseInt(matches[1]) * 3600;
    if (matches[2]) totalSeconds += parseInt(matches[2]) * 60;
    if (matches[3]) totalSeconds += parseInt(matches[3]);
    return totalSeconds;
  }

  function saveProgress() {
    const checkedVideos = [];
    document
      .querySelectorAll("input[type='checkbox']:checked")
      .forEach((cb) => checkedVideos.push(cb.id));

    localStorage.setItem(
      `completedVideos_${userHash}`,
      JSON.stringify(checkedVideos)
    );

    if (checkedVideos.length > 0) {
      localStorage.setItem(`lastCompletionDate_${userHash}`, getTodayDate());

      if (!localStorage.getItem(`currentStreak_${userHash}`)) {
        localStorage.setItem(`currentStreak_${userHash}`, "1");
        localStorage.setItem(`longestStreak_${userHash}`, "1");
      }
    } else {
      localStorage.removeItem(`lastCompletionDate_${userHash}`);
    }
  }

  function loadProgressFromStorage() {
    const completedVideos =
      JSON.parse(localStorage.getItem(`completedVideos_${userHash}`)) || [];

    document.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
    });

    completedVideos.forEach((id) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    updateStreakDisplay();
  }

  function updateStreakDisplay() {
    const today = getTodayDate();
    const lastDate = localStorage.getItem(`lastCompletionDate_${userHash}`);
    let currentStreak =
      parseInt(localStorage.getItem(`currentStreak_${userHash}`)) || 0;
    let longestStreak =
      parseInt(localStorage.getItem(`longestStreak_${userHash}`)) || 0;

    const checkedVideos = document.querySelectorAll(
      "input[type='checkbox']:checked"
    );

    if (checkedVideos.length === 0) {
      currentStreak = 0;
      streakText.textContent = `0 day streak (Longest: ${longestStreak})`;
      return;
    }

    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      lastDateObj.setHours(0, 0, 0, 0);

      const todayObj = new Date(today);
      todayObj.setHours(0, 0, 0, 0);

      const timeDiff = todayObj.getTime() - lastDateObj.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
      } else if (daysDiff === 1) {
        currentStreak = (currentStreak || 0) + 1;
      } else if (daysDiff > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      localStorage.setItem(`longestStreak_${userHash}`, longestStreak);
    }

    localStorage.setItem(`currentStreak_${userHash}`, currentStreak);
    streakText.textContent = `${currentStreak} day streak (Longest: ${longestStreak})`;
  }

  function savePlaylist() {
    const playlistId = extractPlaylistId(playlistInput.value.trim());
    if (playlistId) {
      localStorage.setItem(`playlist_${userHash}`, playlistId);
    }
  }

  function loadSavedPlaylist() {
    const savedPlaylist = localStorage.getItem(`playlist_${userHash}`);
    if (savedPlaylist) {
      playlistInput.value = `https://www.youtube.com/playlist?list=${savedPlaylist}`;
      loadBtn.click();
    }
  }

  function updateProgress() {
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    const checked = document.querySelectorAll("input[type='checkbox']:checked");

    if (checkboxes.length === 0) {
      progressText.textContent = "0%";
      const circle = document.getElementById("progressCircle");
      if (circle) {
        circle.style.strokeDashoffset = 219.91;
      }
      completedHoursSpan.textContent = "0";
      percentCompletedSpan.textContent = "0%";
      return;
    }

    const percent =
      checked.length === 0
        ? 0
        : Math.round((checked.length / checkboxes.length) * 100);

    const circle = document.getElementById("progressCircle");
    if (circle) {
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percent / 100) * circumference;
      circle.style.strokeDashoffset = offset;
    }

    progressText.textContent = `${percent}%`;
    percentCompletedSpan.textContent = `${percent}%`;

    let completedSeconds = 0;
    checked.forEach((cb) => {
      const index = parseInt(cb.id.split("-")[1]);
      if (!isNaN(index) && videoDurationsInSeconds[index]) {
        completedSeconds += videoDurationsInSeconds[index];
      }
    });
    const completedHours =
      completedSeconds === 0 ? "0" : (completedSeconds / 3600).toFixed(2);
    completedHoursSpan.textContent = completedHours;

    updateStreakDisplay();
  }

  const mlRecommendationBtn = document.getElementById("mlRecommendationBtn");
  const mlPredictionBtn = document.getElementById("mlPredictionBtn");
  const recommendationModal = document.getElementById("recommendationModal");
  const predictionModal = document.getElementById("predictionModal");
  const mlModalOverlay = document.getElementById("mlModalOverlay");
  const recommendationContent = document.getElementById(
    "recommendationContent"
  );
  const predictionForm = document.getElementById("predictionForm");
  const predictionResult = document.getElementById("predictionResult");
  const ucSummaryText = document.getElementById("ucSummaryText");

  mlRecommendationBtn.addEventListener("click", () => {
    openModal(recommendationModal);
    loadRecommendations();
  });

  mlPredictionBtn.addEventListener("click", () => {
    openModal(predictionModal);
  });

  document.querySelectorAll(".ml-close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.target.dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  mlModalOverlay.addEventListener("click", () => {
    closeModal(recommendationModal);
    closeModal(predictionModal);
  });

  function openModal(modal) {
    modal.classList.remove("hidden");
    mlModalOverlay.classList.remove("hidden");
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    mlModalOverlay.classList.add("hidden");
  }

  async function loadRecommendations() {
    let selectedIndexes = Object.keys(feedbackState)
      .filter((i) => feedbackState[i] === "confused")
      .map((i) => parseInt(i));

    if (selectedIndexes.length === 0) {
      recommendationContent.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ff9500;">
          <p>❌ No lectures marked as 'Confused' yet</p>
          <p style="font-size: 0.9rem; color: #999;">Mark some lectures as confused to get recommendations</p>
        </div>
      `;
      return;
    }

    try {
      recommendationContent.innerHTML = `<p style="text-align: center; padding: 20px;">⏳ Loading recommendations...</p>`;

      const response = await fetch(`${BACKEND_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confused_indices: selectedIndexes,
          lecture_titles: lectureTitles,
        }),
      });

      const data = await response.json();

      if (data.recommendations && data.recommendations.length > 0) {
        let html = '<div class="recommendations-list">';
        data.recommendations.forEach((rec) => {
          html += `<div class="recommendation-item">📚 ${rec}</div>`;
        });
        html += "</div>";
        recommendationContent.innerHTML = html;
      } else {
        recommendationContent.innerHTML = `<p style="text-align: center; padding: 20px;">No recommendations available</p>`;
      }
    } catch (error) {
      recommendationContent.innerHTML = `<p style="color: red; padding: 20px; text-align: center;">❌ Backend error. Make sure backend is running.</p>`;
    }
  }

  predictionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const progress = Number(document.getElementById("predInput").value);
    const prepHours = Number(document.getElementById("hoursInput").value);

    let understoodCount = 0;
    let confusedCount = 0;
    Object.values(feedbackState).forEach((val) => {
      if (val === "understood") understoodCount += 1;
      if (val === "confused") confusedCount += 1;
    });

    let ucRatio;
    if (confusedCount === 0 && understoodCount > 0) {
      ucRatio = 999;
    } else if (understoodCount === 0 && confusedCount > 0) {
      ucRatio = 0;
    } else {
      ucRatio = understoodCount / (confusedCount + 1);
    }

    ucSummaryText.textContent =
      `Understood: ${understoodCount}, Confused: ${confusedCount}, ` +
      `Ratio (U/(C+1)): ${ucRatio.toFixed(2)}`;

    const streakLength =
      parseInt(localStorage.getItem(`currentStreak_${userHash}`)) || 0;
    const completedVideos =
      JSON.parse(localStorage.getItem(`completedVideos_${userHash}`)) || [];
    const lecturesCompleted = completedVideos.length;

    try {
      predictionResult.innerHTML = "⏳ Predicting...";
      predictionResult.classList.remove("hidden");

      const response = await fetch(`${BACKEND_URL}/predict_performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: [
            progress,
            prepHours,
            streakLength,
            lecturesCompleted,
            ucRatio,
          ],
        }),
      });

      const data = await response.json();
      const isOnTrack = data.prediction === "On Track";

      predictionResult.innerHTML = `🎯 ${data.prediction}`;
      predictionResult.classList.remove("hidden", "success", "at-risk");
      predictionResult.classList.add(isOnTrack ? "success" : "at-risk");
    } catch (error) {
      predictionResult.innerHTML = "❌ Backend error";
      predictionResult.classList.add("at-risk");
      predictionResult.classList.remove("hidden");
    }
  });

  loadSavedPlaylist();
});
