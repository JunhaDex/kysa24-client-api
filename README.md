# MATE Backend

SNS App for KYSA 2025

## 📝 프로젝트의 목적

MATE는 2025년 청년대회 참가자들을 위해 특별히 제작된 소셜 네트워킹 플랫폼입니다. Nest.js를 기반으로 구축된 RESTful API 서버입니다.
이 프로젝트의 핵심 목표는 청년대회 기간 동안 참가자들이 서로 원활하게 소통하고 교류하며, 공동체 의식을 함양할 수 있는 디지털 공간을 제공하는 것입니다. 실시간 채팅, 프로필 공유, 게시판 활동 등을 통해
참가자들이 더 깊은 유대감을 형성하고 소중한 추억을 만들 수 있도록 돕고자 합니다.

## 🛠️ 기술스택

- FE: Vue.js, Typescript, Vite, pinia store, dayjs, axios
- BE: Nest.js + Fastify, MySQL, Redis, Firebase, TypeORM, sharp
- Infra: GCP CloudRun, Firebase Hosting & Messaging, Docker, Github Action

## ✨ 핵심 기능

- 다이렉트 메세지 (실시간 채팅)
- 자유게시판
- 호감 보내기 티켓 (일 10회)
- 프로필 설정
- 참가자 목록 / 조 검색

## 📂 프로젝트 구조

- `resources`: 리소스 지향 아키텍쳐를 따라 각 리소스별로 모듈, 서비스, 컨트롤러를 정의합니다. (예: users, posts, chats 등)
    - `controller`: 각 리소스에 대한 HTTP 요청을 처리합니다. 요청을 적절한 서비스 메서드로 라우팅하고, 응답을 반환합니다.
    - `service`: 비즈니스 로직을 담당합니다. 데이터베이스와 상호작용하고, 필요한 처리를 수행합니다.
    - `entity`: TypeORM을 사용하여 데이터베이스 테이블과 매핑되는 엔티티 클래스를 정의합니다.
    - `module`: 각 리소스의 모듈을 정의합니다. 관련된 컨트롤러와 서비스를 의존성 주입*을 통해 연결합니다.
- `middlewares`: 요청과 응답을 가로채어 추가적인 처리를 수행하는 미들웨어를 정의합니다. (예: 로깅, 인증 등)
- `providers`: 외부 서비스와의 연결을 정의하고 추상화합니다. Firebase와의 연결 및 각 DBMS와의 연결을 정의합니다.

## 💉 의존성 주입 (Dependency Injection, DI)

Nest.js 는 의존성주입 패턴을 기반으로 설계되었습니다. DI는 클래스 외부에서 종속 객체를 생성하고, 종속 클래스가 객체를 생성하는 대신 런타임에 주입을 통해 해당 객체를 해당 클래스에 의존하는 다른 클래스에
제공합니다. DI의 장점은 모듈화되고 유지 관리가 용이한 코드를 생성한다는 것입니다.

## ☁️ 인프라

사용자의 요청은 먼저 GCP Load Balancer로 전달됩니다. 정적 콘텐츠(HTML, CSS, JS) 요청의 경우, 트래픽은 Cloud CDN을 통해 캐시된 데이터를 빠르게 제공받거나 Cloud Storage에
저장된 원본 파일로 라우팅됩니다. API와 같은 동적 요청은 Load Balancer를 통해 백엔드 서비스인 CloudRun으로 전달되며, CloudRun은 DB Compute Engine Instance와 통신하여
비즈니스 로직을 처리합니다. 이러한 구조는 트래픽을 효율적으로 분산시키고, 사용자에게 안정적이고 빠른 서비스 경험을 제공합니다.