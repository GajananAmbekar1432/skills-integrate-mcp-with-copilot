document.addEventListener("DOMContentLoaded", () => {
  // ── Git branch background animation ──────────────────────────────────────
  (function initGitBackground() {
    const canvas = document.getElementById("git-bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Branch colors using lime-green school palette
    const BRANCH_COLORS = [
      "#32CD32", "#228B22", "#76FF03", "#00C853",
      "#AEEA00", "#69F0AE", "#B2FF59", "#1B5E20",
    ];

    const LANE_COUNT = 7;
    const NODE_RADIUS = 5;
    const SPEED = 0.6; // pixels per frame (slow scroll)

    let lanes = [];
    let commits = []; // { laneIdx, y, color }
    let connectors = []; // { x1, y1, x2, y2 } bezier connectors between lanes
    let offset = 0; // total pixels scrolled (used for pre-generated pattern)

    // Pre-generated commit schedule: relative y positions within a repeating tile
    const TILE_HEIGHT = 600;
    let commitSchedule = []; // { laneIdx, tileY }
    let connectorSchedule = []; // { fromLane, toLane, tileY }

    function buildSchedule() {
      commitSchedule = [];
      connectorSchedule = [];

      // Distribute commits somewhat evenly with random variation
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        // Not every lane has commits in every tile — skip some lanes randomly
        if (lane === 2 || lane === 5) continue; // sparse lanes

        let y = 20 + Math.floor(Math.random() * 40);
        while (y < TILE_HEIGHT) {
          commitSchedule.push({ laneIdx: lane, tileY: y });
          y += 60 + Math.floor(Math.random() * 60);
        }
      }

      // A few branch connector lines per tile
      for (let i = 0; i < 4; i++) {
        const fromLane = Math.floor(Math.random() * LANE_COUNT);
        let toLane = Math.floor(Math.random() * LANE_COUNT);
        while (toLane === fromLane) toLane = Math.floor(Math.random() * LANE_COUNT);
        const tileY = 80 + Math.floor(Math.random() * (TILE_HEIGHT - 160));
        connectorSchedule.push({ fromLane, toLane, tileY });
      }
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Recalculate lane x positions
      lanes = [];
      const step = canvas.width / (LANE_COUNT + 1);
      for (let i = 0; i < LANE_COUNT; i++) {
        lanes.push({
          x: step * (i + 1),
          color: BRANCH_COLORS[i % BRANCH_COLORS.length],
        });
      }
    }

    function getScreenY(tileY, tileOffset) {
      // tileOffset = which tile (0,1,2…); tileY = y within tile
      return tileOffset * TILE_HEIGHT + tileY - offset;
    }

    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const tilesVisible = Math.ceil(canvas.height / TILE_HEIGHT) + 2;
      const baseTile = Math.floor(offset / TILE_HEIGHT) - 1;

      // Draw vertical branch lines
      lanes.forEach((lane) => {
        ctx.beginPath();
        ctx.moveTo(lane.x, 0);
        ctx.lineTo(lane.x, canvas.height);
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.12;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw connectors (bezier curves between lanes)
      connectorSchedule.forEach((c) => {
        for (let t = baseTile; t <= baseTile + tilesVisible; t++) {
          const y = getScreenY(c.tileY, t);
          if (y < -80 || y > canvas.height + 80) continue;

          const x1 = lanes[c.fromLane].x;
          const x2 = lanes[c.toLane].x;
          const color = lanes[c.fromLane].color;

          ctx.beginPath();
          ctx.moveTo(x1, y + 40);
          ctx.bezierCurveTo(x1, y, x2, y + 40, x2, y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.25;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Draw commit nodes
      commitSchedule.forEach((c) => {
        for (let t = baseTile; t <= baseTile + tilesVisible; t++) {
          const y = getScreenY(c.tileY, t);
          if (y < -NODE_RADIUS || y > canvas.height + NODE_RADIUS) continue;

          const lane = lanes[c.laneIdx];
          ctx.beginPath();
          ctx.arc(lane.x, y, NODE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = lane.color;
          ctx.globalAlpha = 0.5;
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      offset += SPEED;
    }

    function animate() {
      drawFrame();
      requestAnimationFrame(animate);
    }

    buildSchedule();
    resize();
    window.addEventListener("resize", resize);
    animate();
  })();
  // ── End Git branch background animation ──────────────────────────────────

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
