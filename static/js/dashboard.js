let isCreating = false;
let nodesData = []; // 노드 데이터 캐싱

// 통합 초기화 함수
async function initDashboard() {
  await Promise.all([loadNodes(), loadVms()]);
  setInterval(loadVms, 5000); // VM만 주기적 갱신
}

// 노드 목록 로드 (동적 select 생성)
async function loadNodes() {
  try {
    const res = await fetch("/provision/api/nodes");
    const data = await res.json();
    nodesData = data.nodes || [];

    const select = document.getElementById("nodeZoneSelect");
    select.innerHTML = '<option value="">노드를 선택하세요</option>';

    nodesData.forEach((node) => {
      const option = document.createElement("option");
      option.value = node.value;
      option.textContent = node.label;
      option.dataset.status = node.status;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("노드 목록 로드 실패:", error);
    document.getElementById("nodeZoneSelect").innerHTML =
      '<option value="">노드 목록 로드 실패</option>';
  }
}

// VM 생성 폼 처리
async function handleVmCreate(e) {
  e.preventDefault();
  if (isCreating) return;

  const form = e.target;
  const submitBtn = document.getElementById("submitBtn");
  const loading = document.getElementById("loading");

  isCreating = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "생성 중...";
  loading.style.display = "block";

  try {
    const formData = Object.fromEntries(new FormData(form));

    // 필수 필드 검증
    if (!formData.node_zone) {
      throw new Error("노드를 선택해주세요.");
    }

    const res = await fetch("/provision/api/vm/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();

    alert(
      `VM 생성 완료!\nID: ${result.vmid}\n노드: ${result.node}\n이름: ${result.name}`,
    );

    form.reset();
    loadVms(); // 목록 갱신
  } catch (error) {
    alert(`생성 실패: ${error.message}`);
  } finally {
    isCreating = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "VM 생성 시작";
    loading.style.display = "none";
  }
}

// VM 목록 로드
async function loadVms() {
  try {
    const res = await fetch("/provision/api/vms");
    const data = await res.json();
    const vms = data.vms || data;

    const vmList = document.getElementById("vmList");
    vmList.innerHTML = vms.length
      ? vms
          .map(
            (vm) => `
            <div class="vm-item">
              <div>
                <strong>${vm.name}</strong> (ID: ${vm.vmid})
                <span style="color: #6b7280; font-size: 14px">@${vm.node}</span>
              </div>
              <div>
                <span class="vm-status status-${getStatusClass(vm.status)}">
                  ${vm.status}
                </span>
                ${vm.mem ? `<span style="margin-left: 12px">${Math.round(vm.mem / Math.pow(1024, 2))}MB</span>` : ""}
              </div>
            </div>
            `,
          )
          .join("")
      : '<div style="text-align: center; color: #6b7280">생성된 VM이 없습니다.</div>';

    // 통계 업데이트
    updateStats(vms);
  } catch (error) {
    document.getElementById("vmList").innerHTML =
      '<div style="color: #ef4444">목록 로드 실패</div>';
  }
}

// 4. 통계 업데이트 (재사용)
function updateStats(vms) {
  const vmsArray = Array.isArray(vms) ? vms : [];
  document.getElementById("vm-count").textContent = vmsArray.length;
  document.getElementById("total-vms").textContent = vmsArray.length;
  document.getElementById("running-vms").textContent = vmsArray.filter(
    (v) => v.status === "running",
  ).length;
  document.getElementById("stopped-vms").textContent = vmsArray.filter(
    (v) => v.status === "stopped",
  ).length;
}

// 5. 상태 클래스 변환
function getStatusClass(status) {
  return status === "running"
    ? "running"
    : status === "stopped"
      ? "stopped"
      : "other";
}

// DOM 이벤트 바인딩 (한 번만)
document.addEventListener("DOMContentLoaded", function () {
  // 초기화
  initDashboard();

  // VM 생성 폼
  document.getElementById("vmForm").onsubmit = handleVmCreate;

  // 노드 선택 상태 표시
  document
    .getElementById("nodeZoneSelect")
    .addEventListener("change", function () {
      const statusEl = document.getElementById("nodeStatus");
      if (this.value) {
        const node = nodesData.find((n) => n.value === this.value);
        if (node) {
          statusEl.innerHTML = `
          CPU: ${node.cpu}%, RAM: ${node.mem_usage}%
          (${node.mem_used_gb}/${node.mem_total_gb}GB), VM: ${node.vm_count}
          `;
          statusEl.style.color =
            node.cpu > 80 ? "#ef4444" : node.cpu > 50 ? "#f59e0b" : "#10b981";
        }
      } else {
        statusEl.textContent = "";
      }
    });
});
