# ovov games 홈페이지 및 프레스킷 구현 지시서

> 아래의 **통합 구현 규칙**이 기존 페이지별 메모와 충돌하면 통합 구현 규칙을 우선한다. 기존 메모의 게임 내용과 디자인 의도는 유지한다.

## 통합 구현 규칙

### 목표·기술·디자인
- 게임 개발사의 공식 홈페이지로, 회사 소개·게임 목록·게임별 소개·프레스킷을 제공한다.
- HTML/CSS/vanilla JavaScript만 사용한다. 정적 호스팅에서 직접 URL 접근과 새로고침이 작동해야 한다. 필요하다면 프레임워크 없는 빌드 스크립트를 작성한다.
- 최대 콘텐츠 너비 1100px, 미니멀한 반응형 디자인, 배경 `#FDF8F1`, 포인트 `#D85A32`, 대비가 충분한 짙은 브라운~블랙 텍스트를 사용한다.
- 전환 애니메이션은 절제하고 `prefers-reduced-motion`을 따른다.
- 지정된 게임 이미지를 임의로 생성하지 않는다. 파일이 없을 때는 동일 경로·파일명으로 교체할 수 있는 흰색 placeholder를 사용한다.

### URL·페이지
| 페이지 | 경로 | 용도 |
| --- | --- | --- |
| Home | `/` | 개발사 소개 |
| Games | `/games/` | 게임 목록 |
| Game Detail | `/games/{slug}/` | 일반 방문자용 게임 소개 |
| Press Kit | `/press/{slug}/` | 기자·크리에이터용 자료 |

- 각 게임에 고유한 kebab-case slug를 지정한다. 예: `just-pancake-simulator`.
- 목록에서 게임 상세 및 프레스킷으로 이동할 수 있게 한다. 상세는 목록의 설명·영상·스토어 링크를 재사용한다.
- 게임별 프레스 페이지를 외부에서 직접 공유할 수 있어야 한다.

### 콘텐츠 및 언어
- 기본 언어는 영어, 초기 추가 언어는 한국어다. 언어 선택은 상단 바에서 제공한다.
- 페이지 텍스트를 언어별 Markdown으로 관리한다. 한 언어의 파일이나 필드가 없거나 비어 있으면 해당 필드에 영어를 사용한다.
- 구조화된 게임 정보는 YAML front matter, 소개·키 피처 같은 본문은 Markdown으로 둔다.
- 새로운 게임의 목록·상세·프레스 페이지는 기존 HTML/CSS/JS 수정 없이 Markdown 및 게임 에셋을 추가해 생성할 수 있어야 한다.
- 제목, 개발사, 출시일, 링크 등 여러 페이지에서 공유하는 사실 정보는 한 곳에서 정의하거나 생성 시 공유해 불일치를 막는다.
- 공통 UI 문구와 홈/About의 소개도 언어별 콘텐츠에서 관리한다.
- Trailer, GIFs, Screenshots, Awards, Articles, Credits, Price, Playtime, AI Usage, 플랫폼 버튼, press.zip 등 선택적 값이 없으면 제목과 빈 공간을 포함해 해당 필드·섹션 전체를 숨긴다.

```text
content/
  en/
    home.md
    games.md
    games/just-pancake-simulator.md
    press/just-pancake-simulator.md
  ko/
    home.md
    games.md
    games/just-pancake-simulator.md
    press/just-pancake-simulator.md
assets/
  common/
    logo_landscape.png
    home_loop.webm
    home_loop_poster.jpg
  just-pancake-simulator/
    hero.png
    background.png
    screenshots/screenshot_00.png
    gifs/gameplay_00.gif
    logos/logo.png
    keyart/capsule_portrait.png
    keyart/capsule_landscape.png
    keyart/capsule_square.png
    press.zip
```

- 기존의 `[game-name_hero.png]` 같은 표기는 위 게임별 폴더 경로로 치환한다. 같은 경로에 이미지를 교체하면 새 이미지가 반영되어야 한다.
- README에 새 게임 추가, 번역 및 영어 fallback, 이미지 교체, 빌드·배포 방법을 기록한다.

### 공통 UI·모바일
- 상단: 가로 2:세로 1 로고, Home/Games, 오른쪽 언어 선택. 모바일에서는 조작 가능한 접이식 메뉴를 사용할 수 있다.
- 푸터: `ovovgames@gmail.com`, 개발자 X/YouTube `@ovoveuni`, 공식 YouTube/X/Bluesky/Instagram `@ovovgames`, Copyright, Back to top. SNS URL은 데이터에 입력하며 비어 있으면 링크 아이콘을 숨긴다.
- 게임 목록: 데스크톱 설명 왼쪽·영상 오른쪽, 모바일 설명 다음 영상.
- 프레스킷 게임 정보: 데스크톱 본문 약 70%·Fact Sheet 약 30%의 2열, 모바일 본문 다음 Fact Sheet의 1열.
- Key Features: 데스크톱 3열, 모바일 1열. 3개 단위로 늘릴 수 있고 마지막 행이 3개 미만이어도 깨지지 않아야 한다.
- 에셋 그리드: 데스크톱 2열, 모바일 1열.

### 홈 배경과 소개
- 화면을 채우는 반복 영상 `home_loop.webm`과 정적 포스터 `home_loop_poster.jpg`를 기본으로 사용한다. 대형 GIF보다 로딩을 우선한다. 영상은 무음, 자동 반복으로 설정하고 로딩 실패 또는 모션 축소 설정에서는 포스터를 표시한다.
- 배경 위 포인트 컬러 약 0.5 알파 오버레이와 슬로건을 배치한다. 실제 텍스트 대비를 확인한다.
- 영문 소개 문구: **ovov games is a South Korean indie game studio run by solo developer @ovoveuni.**
- 슬로건: **our value, our variety**. 프레스킷 About에도 동일한 데이터를 사용한다.

### 프레스킷 사용성
- Hero 아래 게임 제목과 Store, Watch Trailer, Download Press Kit 버튼을 배치한다. 링크/파일이 없으면 해당 버튼은 숨긴다.
- One-line Description, Short Description, Key Features 묶음 등에 Copy 버튼을 제공한다. 서식을 제거한 plain text를 복사하고 성공하면 잠시 `Copied!`로 바꾼다.
- 이미지 클릭 시 원본 비율 라이트박스를 연다. Escape로 닫고 키보드 초점을 관리한다.
- 모든 이미지와 GIF에 개별 원본 다운로드 링크를 둔다. 라이트박스에도 `Download Original`을 둔다. 웹 썸네일 최적화 과정에서 원본을 덮어쓰지 않는다.
- `press.zip`이 있으면 전체 다운로드 버튼을 제공하고, ZIP에 페이지와 일치하는 원본을 담는다.
- 대외 정보와 About 다음에 **Press Contact**: ovov games / `ovovgames@gmail.com` 메일 링크를 둔다.

### 날짜·가격 데이터
- 출시 시각은 KST 오프셋이 포함된 ISO 8601 문자열 하나로 저장한다. 예: `2026-10-20T02:00:00+09:00`.
- `release_display`를 `date`, `month`, `year`, `datetime` 중 선택한다. Fact Sheet의 기본값은 간결한 날짜다. `datetime` 선택 시에만 KST/UTC/PT를 해당 지역 날짜까지 변환해 표시하며, PT 일광절약시간을 반영한다.
- 가격은 `price.usd`, `price.krw`로 각각 수동 입력한다. 환율로 자동 계산하지 않는다. 한국어에서는 KRW를 우선 표시한다.

### 메타데이터·접근성·성능
- 모든 페이지에 고유한 title, meta description, canonical URL, favicon, Open Graph, Twitter Card를 둔다. 게임별 OG 이미지를 별도 지정할 수 있어야 한다.
- 프레스킷 title 예: `Just Pancake Simulator | Press Kit | ovov games`; 상세 title 예: `Just Pancake Simulator | ovov games`.
- 직접 링크를 붙여 공유했을 때 해당 게임의 메타데이터가 응답 HTML에 존재해야 한다. JS 실행 후에만 메타 태그를 채우는 방식에 의존하지 않는다.
- 의미 있는 이미지에는 alt 텍스트, 장식에는 빈 alt를 사용한다. 키보드 이동, focus 표시, 충분한 대비, 모션 축소를 지원한다. 움직이는 GIF는 멈춤 조작 또는 정지 프레임 대체를 제공한다.
- 아래쪽 이미지는 lazy loading하고 처음 보이는 Hero에는 적용하지 않는다. width/height 또는 aspect-ratio를 지정해 레이아웃 이동을 막는다. 영상 임베드와 원본 다운로드 파일은 초기 로딩을 지연한다.
- 웹에 표시할 이미지 5MB 미만, GIF 15MB 미만을 목표로 준비하되 원본 다운로드 품질을 임의로 낮추지 않는다.

### 프레스 Markdown 데이터 예시
```markdown
---
slug: just-pancake-simulator
title: Just Pancake Simulator
developer: ovov games
release_datetime: 2026-10-20T02:00:00+09:00
release_display: date
platforms:
  - name: Steam
    url: https://store.steampowered.com/app/5286420/Just_Pancake_Simulator/
genres: [Simulation, Casual, Cooking, Physics]
playtime: "~30 min"
price:
  usd: "$1.99"
  krw: "₩2,300"
languages: [English, Korean, French, Italian, German, Spanish (Spain), Russian, Japanese, Simplified Chinese, Traditional Chinese, Turkish, Portuguese (Brazil), Polish]
ai_usage: AI is only used for translation.
trailer: ""
og_image: assets/just-pancake-simulator/keyart/capsule_landscape.png
---

# One-line Description

A short physics-based cooking game about simply making pancakes.

# Short Description

Just Pancake Simulator is a short physics-based cooking game about simply making pancakes for someone you love. Flip, burn, drop, and somehow serve the perfect stack.

# Key Features

## 🍳 Physics-Driven Flipping

Feel the weight of the pan and master the perfect flip. Time it right, catch your pancake cleanly, or watch it fly somewhere it definitely shouldn't.

## 🥞 Cook Both Sides Properly

Golden brown or completely burnt—it's all in your hands. Watch the heat, flip at the right moment, and cook both sides as evenly as you can.

## ⭐ Make the Perfect Stack

Make three pancakes, finish in under 3 minutes, and cook every side perfectly. Nail all three challenges to earn three stars—and your crown.
```

- 실제 트레일러 URL은 준비되면 추가한다. 한국어 장르명은 시뮬레이션·캐주얼·요리·물리로 관리한다.
- KRW 가격과 출시 시각은 현재 계획값이므로 스토어에서 확정되면 데이터에서 수정한다.

### 완료 조건
- 네 경로(`/`, `/games/`, `/games/just-pancake-simulator/`, `/press/just-pancake-simulator/`)가 직접 접속과 새로고침에 동작한다.
- 영어·한국어 전환 및 누락 필드 영어 fallback, 새 게임 추가, 없는 섹션 숨김을 확인한다.
- 모바일·데스크톱, 다운로드·Copy·라이트박스·키보드 조작, 게임별 공유 메타데이터를 확인한다.
- README에 콘텐츠 관리와 빌드·배포 절차가 있다.

## 기존 페이지별 원본 메모
### 이미지
- 페이지를 구성하는 모든 이미지는 생성이 아닌, 지정된 파일명을 사용하여 구현할 것
- 파일명이 지정되어 있으나 실제 이미지 파일이 없을 경우, 흰색만으로 구성된 임의의 placeholder 이미지를 생성하여 사용할 것 (단, 파일명을 지정한 것과 같이 생성하여 쉽게 교체 가능하도록 함)

### 프레스 페이지
- 프레스 페이지의 경우 이미지, 텍스트만 대체하면 새로운 페이지를 생성할 수 있도록 템플릿화 필요
- 이미지는 이름을 기준으로 파일을 교체했을 경우에도 정상적으로 작동하도록 구현
- 텍스트는 개별 .md 파일을 기준으로 내용이 갱신되도록 구현

### 언어
- 언어 설정은 기본 영어, 상단 바에서 지정된 언어 목록을 선택할 수 있게 함
    - 선택한 언어의 내용이 없을 경우 영어 데이터로 표기
    - 초기 버전 기준 영어, 한국어
- 모든 텍스트 데이터는 각 페이지마다의 md 파일로 관리하며 언어별로 텍스트 입력이 쉽게 데이터 구조를 구성해야 함

# 기본 설정
### 목적
- 게임 개발사의 공식 홈페이지
- 게임 개발사 소개 및 게임 목록 확인, 프레스킷 확인이 주요 목적

### 컬러 및 스타일
- 미니멀리스트 스타일
    - 가로 길이 최대 1100px
    - 반응형 웹사이트
    - 빠른 로딩
    - UI는 미니멀하되 트윈 등은 적절하게 들어가길 희망
- 컬러
    - 포인트 컬러: #D85A32
    - 배경을 포함한 미색: #FDF8F1
    - 텍스트: 위 컬러들과 어울리는, 브라운~블랙 계열의 어두운 색상
- No Frameworks, HTML / CSS / vanilla JavaScript Only

### 페이지 구조
- home
    - /games
        - /games/game-name (ex. /press/just-pancake-simulator)

### 상단 바
- [logo_landscape.png] ovov games 로고 (가로2:세로1 비율)
- Home / Games (좌측 정렬, 각 페이지로 이동 버튼)
- 언어 설정 (우측 정렬)

### 하단 푸터
- contact: ovovgames@gmail.com
- SNS
    - 클릭 가능한 아이콘으로 구성, 터치 시 해당 링크로 연동
    - 개발자 계정모음: X(@ovoveuni), Youtube(@ovoveuni)
    - 공식 계정모음: Youtube(@ovovgames), X(@ovovgames), bluesky(@ovovgames), Instagram(@ovovgames)
- Copyright 2026 ovov games. All rights reserved.
- back to top 버튼



# 페이지: 홈
### 내용
- [home_loop.gif] 화면 전체 차지하는 gif 루프 + 그 위에 포인트컬러 알파 0.5로 올리기
- 해당 이미지 위 슬로건

> our value, our variety

ovov games is a game studio in South Korea,<p>of solo game developer @ovoveuni.



# 페이지: 게임 목록
- 레퍼런스: https://triband.net/
- 섹션 단위로 게임 배치 (스크롤해서 내려보는 형태)
- 화면 전체 차지하는 png 배경 ([game-name_bg.png] (ex. [just-pancake-simulator_bg.png])), 그 위에 포인트컬러 알파 0.3으로 올리기
- (왼쪽) 게임 이름, 한 줄 설명, 짧은 설명 텍스트 (오른쪽) 트레일러 영상(youtube 임베드)
- 입력값에 따라 스팀 바로가기 버튼 등



# 페이지: 프레스킷 페이지
- 구조를 짜놓고 텍스트, 이미지만 넣으면 쉽게 페이지를 추가할 수 있도록 템플릿화 필요
    - 텍스트: .md
    - 이미지: 규격에 맞는 이미지

### 최상단
- 가로가 꽉 차는 Hero Image [game-name_hero.png]
- 이미지 제작 시 게임 제목이 포함되도록 제작

### 섹션 1: 게임 정보
- 메인 영역 + 우측 사이드바 (좁게) 2열로 구성

[메인 영역]
- 한 줄 소개
- 짧은 소개
- Key Features (3개 블록 가로로 나열, 3개 단위로 추가 가능케 하기)

[사이드바] = Fact Sheet
- 게임 제목
- 개발사
- 출시일 (KST 기준으로 입력, KST/PT/UTC로 표기)
    - 출시일 형식 지정 가능해야
    - ex. 2027. 03. 01 입력 > Mar 01, 2027 / MAR 2027 / 2027 등의 스코프로 표기 선택 가능해야 함
- 플랫폼 (링크 형식, 클릭 시 해당되는 사이트로 이동)
- 장르
- 플레이타임
- 가격
- 지원 언어
- 생성형 AI 사용처

### 섹션 2: 에셋 모음
- Trailer (유튜브 링크 임베드)
- GIFs (1920x1080, 그리드 형식 구성)
    - [game-name_gif0.gif] (0~ 숫자 증가하는 형식으로)
- Screenshots (1920x1080, 그리드 형식 구성)
    - [game-name_screenshot0.png] (0~ 숫자 증가하는 형식으로)
- Logos & Key art (규격 자유이되 가급적 스팀 업로드 규격에 맞춤)
    - 캡슐아트_Portrait [game-name_capsule_portrait.png]
    - 캡슐아트_Landscape [game-name_capsule_landscape.png]
    - 캡슐아트_Square [game-name_capsule_square.png]
    - 로고_W:1280 혹은 H:720 [game-name_logo.png]

- 전체 파일 다운로드 버튼 [press.zip]
- (데이터 주의사항: 모든 이미지는 5mb 미만이어야 함, gif는 15mb 미만)

### 섹션 3: 대외 정보

데이터 입력 없을 시 개별 섹션 생략

- Awards & Recognition
- Selected Articles
- Credit

### 섹션 4: About ovov games
- 2:1 비율 로고 [logo_landscape.png]
- 슬로건, 설명은 [#페이지:홈]의 정보 사용
    - our value, our variety
    - ovov games is a game studio in South Korea,<p>of solo game developer @ovoveuni.



# 게임 정보: Just Pancake Simulator
[메인 영역]
- 한 줄 소개: A short physics-based cooking game about simply making pancakes
- 짧은 소개: Just Pancake Simulator is a short physics-based cooking game about simply making pancakes for someone you love. Flip, burn, drop, and somehow serve the perfect stack.
- Key Features
    - 🍳 Physics-Driven Flipping: Feel the weight of the pan and master the perfect flip. Time it right, catch your pancake cleanly, or watch it fly somewhere it definitely shouldn't
    - 🥞 Cook Both Sides Properly: Golden brown or completely burnt─it's all in your hands. Watch the heat, flip at the right moment, and cook both sides as evenly as you can.
    - ⭐ Make the Perfect stack: Make three pancakes, finish in under 3 minutes, and cook every side perfectly. Nail all three challenges to earn three stars─and your crown.

[사이드바] = Fact Sheet
- 게임 제목: Just Pancake Simulator
- 개발사: ovov games
- 출시일 (KST 기준으로 입력, KST/PT/UTC로 표기): 2026 10/20 KST 02:00
- 플랫폼 (링크 형식, 클릭 시 해당되는 사이트로 이동): Steam (https://store.steampowered.com/app/5286420/Just_Pancake_Simulator/)
- 장르: 시뮬레이션, 캐주얼, 요리, 물리
- 플레이타임: ~30 min
- 가격: $1.99
- 지원 언어: 한국어, 영어, 프랑스어, 이탈리아어, 독일어, 스페인어 - 스페인, 러시아어, 일본어, 중국어 간체, 중국어 번체, 튀르키예어, 포르투갈어 - 브라질, 폴란드어
- 생성형 AI 사용처: Generative AI is only used for translation.
