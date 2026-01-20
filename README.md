# VM Provisioning Dashboard

Proxmox VE 클러스터를 대상으로 FastAPI 기반 셀프서비스 **VM 프로비저닝 대시보드**를 제공하는 프로젝트입니다.
사용자는 웹 UI에서 노드와 스펙을 선택하고, 백엔드는 Proxmox API와 Cloud-Init 템플릿 ID 9000을 클론하여 VM을 자동 생성합니다.

## 주요 기능

- Proxmox 클러스터 노드 상태 조회 (CPU, 메모리, 실행 VM 수)
- 노드 선택 후 VM 생성 (vCPU, 메모리, 디스크, 이름 지정)
- Cloud-Init 템플릿 클론 기반 빠른 프로비저닝
- VM 목록 조회 (상태, 메모리 사용량, 업타임)
- 대시보드 웹 UI (HTML + JS + 간단한 통계 카드)

## 아키텍처 개요

- 프론트엔드
  - `templates/dashboard.html` + `static/css/dashboard.css` + `static/js/dashboard.js`
  - 브라우저에서 `/provision/dashboard`로 접근
- 백엔드
  - FastAPI 애플리케이션 (`app/main.py`)
  - API 라우터 (`app/api/routes/api.py`, `app/api/routes/dashboard.py`)
  - 설정 관리 (`app/core/config.py`, Pydantic Settings 사용)
- Proxmox 연동
  - Proxmox API 토큰 방식 연결
  - 클라우드 이미지/Cloud-Init 템플릿을 미리 생성해둔 VM (예: VMID `9000`)을 클론하여 새 VM 생성

## 사전 준비 사항

1. **Proxmox 쪽 준비**
   - Cloud-Init 템플릿 VM 생성 (예: Ubuntu Cloud-Init 이미지 기반)
   - 템플릿 VMID를 `9000`으로 두고 템플릿으로 전환
     - 예시: Proxmox 문서의 [Cloud-Init 템플릿 가이드](https://pve.proxmox.com/wiki/Cloud-Init_Support) 참고

2. **API 토큰 생성**
   - Proxmox 웹 UI에서 전용 사용자 또는 토큰 생성
   - 최소 권한: 해당 노드/VM에 대한 `VM.Audit`, `VM.Allocate`, `VM.Config.Disk`, `VM.Config.CDROM`, `VM.Config.Network`, `VM.PowerMgmt` 등

3. **환경 변수 또는 `.env` 설정**

   `app/core/config.py`의 `Settings`가 읽을 값:

   ```python
   PROXMOX_HOST=proxmox.example.com
   PROXMOX_USER=root@pam
   PROXMOX_TOKEN_NAME=provisioning
   PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

   `VM_TEMPLATE` 기본값은 코드에서 제공되며, 필요시 `.env` 혹은 환경 변수로 치환할 수 있습니다.

## 설치 및 실행

```sh
# 가상 환경 구성
python3 -m venv .venv
source .venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# 개발 서버 실행
fastapi run app/main.py
```

### 사용 방법

1. 웹 브라우저로 대시보드 접근
   - `http://host_address/provision/dashboard`
2. 노드 선택
   - 노드 존 선택 상자에서 원하는 Proxmox 노드 선택
   - CPU/RAM/VM 개수 등의 상태 표시
3. VM 사양 입력
   - vCPU, RAM(MB), disk(GB), VM 이름
   - 기본값은 `app/core/config.py`의 `VM_TEMPLATE`에서 가져옴
4. VM 생성
   - **VM 생성 시작** 단추 누르기
   - 백엔드에서는 다음 순서로 작업
     1. `cluster.nextid`로 새 VMID 할당
     2. 템플릿 VM(9000)을 지정 노드에 클론
     3. vCPU, RAM, KVM CPU model, VM 이름
     4. 설정한 디스크 용량만큼 증분
     5. 비동기 task로 VM 실행
5. VM 목록 확인
   - **VM 목록**에 새 VM이 나타나고 상태가 주기적으로 갱신됨

## API 엔드포인트

- `GET /`

  상태 확인

- `GET /health`

  healthcheck 전용

- `GET /provision/dashboard/`

  대시보드 페이지(HTML)

- `GET /provision/api/vms`

  클러스터 내부 VM 목록 및 상태 반환

- `POST /provision/api/vm/create`

  VM 생성
  - 요청 예시

    ```json
    {
      "node_zone": "pve-public-01",
      "vcpu": 2,
      "memory": 4096,
      "resize": 20,
      "vm_name": "my-web-vm"
    }
    ```

### 내부 동작 요약

- `app/api/routes/api.py`
  - Proxmox API 클라이언트 lazy init (토큰 기반)
  - Cloud-Init 템플릿(예: 9000)을 클론해서 새 VM 생성
  - VM 생성 실패 시 롤백(중지 및 삭제 시도)
  - 백그라운드 태스크로 VM 전원 ON
- `static/js/dashboard.js`
  - 노드 목록/상태 로드
  - VM 생성 폼 제출 처리
  - VM 목록 및 통계(총 VM 수, running, stopped) 갱신
- 향후 확장 아이디어
  - 사용자/테넌트별 VM 쿼터 및 인증 연동
  - VM 삭제/재부팅/콘솔 URL 제공 API
  - 템플릿 종류 선택(예: Ubuntu, Debian, Rocky 등)
  - Terraform/Ansible과 연계한 추가 설정 자동화
