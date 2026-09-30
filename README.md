# ovov games 공식 웹사이트

기존 디자인을 사용하는 HTML/CSS/vanilla JavaScript 정적 사이트입니다. Node.js는 Markdown을 HTML로 빌드할 때만 사용하며 배포 서버에는 필요하지 않습니다.

## 로컬 실행

Node.js 20 이상에서 프로젝트 폴더를 열고 실행합니다.

```sh
npm ci
npm run build
npm run dev
```

미리보기: http://127.0.0.1:4173/official/ . `npm run dev`는 시작할 때 빌드하고, content/ 아래 Markdown을 저장하면 자동 재빌드 및 브라우저 새로고침을 수행합니다. 에셋·빌드 코드 변경 후에는 `npm run build`를 실행하고 새로고침합니다. 배포된 사이트는 저장소에 push한 뒤 GitHub Actions 배포가 완료되어야 갱신됩니다. `npm test`로 번역 fallback, 게임 추가, 선택 섹션, 날짜 변환, 파일 및 ZIP 일치를 검사합니다.

## 콘텐츠 수정

| 파일 | 내용 |
| --- | --- |
| `content/en/site.md` | 사이트 주소, 로고, 이메일, SNS, 공통 UI 문구 |
| `content/ko/site.md` | 공통 UI의 한국어 번역 |
| `content/{en,ko}/home.md` | 홈 소개·슬로건·대표 게임·영상/포스터 경로. 푸터도 이 소개를 사용 |
| `content/{en,ko}/games.md` | 게임 목록 제목·설명 |
| `content/en/games/{slug}.md` | 게임의 공통 사실 정보 및 영어 본문 |
| `content/ko/games/{slug}.md` | 게임의 한국어 본문 및 표시 문구 |
| `content/{en,ko}/press/{slug}.md` | 프레스 검색 설명, 선택적 수상/기사/크레딧 및 본문 재정의 |

맨 위 `---` 사이의 YAML에 구조화된 정보를, 그 아래 Markdown에 설명을 작성합니다. 본문 구분 키는 두 언어 모두 `# One-line Description`, `# Short Description`, `# Tagline`, `# Key Features`를 사용합니다. 특징은 `## 특징 제목` 아래에 설명을 쓰며 개수 제한이 없습니다. 프레스 전용 섹션은 `# Awards`, `# Articles`, `# Credits`입니다. 일반 문단·목록·링크·강조를 사용할 수 있고 임의 HTML은 출력하지 않습니다.

게임 소개와 특징은 상세·목록·프레스에서 공유합니다. 특별한 이유가 없다면 press Markdown에 같은 소개를 중복 작성하지 마세요. 공통 사실인 출시 시각·표시 범위·가격·플랫폼 URL·미디어 경로·트레일러는 영어 게임 파일에서 한 번만 정의합니다. 한국어 파일은 장르, 지원 언어, 플레이타임, AI 설명, 플랫폼 이름 등을 번역할 수 있습니다.

### 번역과 영어 fallback

한국어 파일 자체가 없거나 필드·본문 섹션이 누락/공백이면 영어 값을 사용합니다. 객체는 필드별로 fallback하며 배열은 전체 번역 배열을 사용합니다. 특징은 순서대로 비교하여 번역이 없는 제목/설명/나머지 항목에 영어를 사용합니다. 따라서 번역에서도 영어와 특징 순서를 맞춥니다.

언어를 바꾸는 링크는 같은 페이지의 EN/KO로 이동합니다. 언어 정보는 URL에 있으므로 직접 공유한 한국어 페이지가 과거 선택값 때문에 영어로 바뀌지 않습니다. 기본 `index.html`은 영어입니다.

### 새 게임 추가

1. `content/en/games/new-game.md`를 추가하고 `slug: new-game`, `title` 및 원하는 필드/본문을 작성합니다. 파일 이름과 slug는 소문자 kebab-case로 일치시킵니다.
2. `assets/new-game/`에 이미지를 넣고 YAML의 `hero`, `background`, `cover`, `og_image`에서 경로를 지정합니다.
3. `screenshots/`, `gifs/`, `keyart/`, `logos/` 안 이미지는 이름순으로 자동 수집합니다. 스크린샷이나 GIF가 없으면 해당 섹션을 표시하지 않습니다.
4. 한국어 게임 파일과 양 언어 프레스 파일은 필요할 때 추가합니다. 없어도 영어 게임 정보로 페이지가 생성됩니다.
5. `npm run build`를 실행하면 목록 및 `/games/new-game/`, `/press/new-game/`의 영·한 HTML이 생성됩니다. HTML/CSS/JS 수정은 필요 없습니다.

기존 게임을 복사해서 시작할 경우 복사한 YAML의 이미지·스토어·출시 정보가 이전 게임을 가리키지 않는지 확인합니다.

### 선택 데이터와 다운로드

영어 원본에서 값이 없으면 Trailer, GIFs, Screenshots, Awards, Articles, Credits, Price, Playtime, AI Usage, 플랫폼 버튼을 출력하지 않습니다. 한국어만 비워 두면 영어 fallback이 적용되므로 해당 기능을 숨기려면 영어 원본도 비워 주세요.

트레일러는 `trailer`에 YouTube URL을 입력합니다. 목록·상세·프레스에서 재사용하며 재생 버튼을 누를 때만 YouTube iframe을 로딩합니다. 그 외 URL은 외부 영상 링크로 표시합니다.

개별 이미지 캡션이나 노출 순서를 지정하려면 게임 YAML에 다음과 같이 작성합니다. `media.screenshots: []`는 해당 카테고리를 숨깁니다. 선언하지 않으면 폴더를 자동 수집합니다.

```yaml
media:
  screenshots:
    - src: assets/new-game/screenshots/screenshot_00.png
      alt: 팬케이크를 뒤집는 장면
```

GIF는 빌드에서 첫 프레임 PNG를 `thumbnails/`에 생성합니다. 기본으로 정지 프레임이 보이고 재생·정지 버튼을 제공합니다. 원본 GIF 다운로드는 그대로 유지합니다.

`press_zip: assets/new-game/press.zip`을 지정하면 빌드 때 Hero·배경·키아트·노출 미디어의 원본을 ZIP으로 묶어 상단과 하단에 다운로드 버튼을 생성합니다. 지정하지 않으면 ZIP과 버튼을 생성하지 않습니다. 이 파일은 빌드 산출물이므로 ZIP을 직접 수정하지 말고 원본 에셋을 수정하세요. 썸네일로 원본을 덮어쓰지 않습니다.

### 이미지 교체와 홈 영상

같은 경로·파일명으로 원본을 교체한 뒤 다시 빌드합니다. 빌드는 이미지 크기 속성과 ZIP도 갱신합니다. 브라우저 캐시가 남으면 강력 새로고침하세요. 지정된 PNG/JPG/WebP가 없으면 동일 경로에 흰색 placeholder를 생성합니다. 웹 이미지 5MB 미만, GIF 15MB 미만을 권장합니다.

- 공식 로고: `assets/common/logo_landscape.png` (2:1), 파비콘: `logo_square.png`.
- 홈 포스터: `assets/common/home_loop_poster.jpg`. 현재 원본 미제공으로 흰색 placeholder입니다.
- 홈 영상: `assets/common/home_loop.webm` 추가 후 빌드하면 무음·반복 재생이 활성화됩니다. 재생 실패·영상 없음·모션 축소 설정에서는 포스터를 표시합니다. 일시정지 버튼도 제공합니다.
- 트레일러, GIF, 별도 게임 로고는 아직 미제공입니다. 준비된 데이터만 표시합니다.

## 출시일과 가격

```yaml
release_datetime: "2026-10-20T02:00:00+09:00"
release_display: date
price:
  usd: "$1.99"
  krw: "₩2,300"
```

`release_display`는 `date` / `month` / `year` / `datetime` 중 선택합니다. 날짜는 KST 기준이며 `datetime`만 KST·UTC·PT의 지역 날짜/시각을 모두 출력합니다. PT는 일광절약시간을 반영합니다. 가격은 직접 입력하며 한국어는 KRW, 영어는 USD를 우선합니다. 현재 출시일과 가격은 계획값입니다.

## 푸터와 SNS

`site.md`의 `socials.studio`와 `socials.developer`를 수정합니다. URL이 비어 있는 계정은 아이콘·링크를 숨깁니다. YouTube/X/Instagram은 제공된 계정명으로 연결했습니다. Bluesky는 `https://bsky.app/profile/ovovgames.bsky.social`로 연결했습니다. 푸터의 소개문은 각 언어 home.md의 Introduction을 메인과 함께 사용합니다.

## GitHub Pages 배포

예정 주소는 `https://ovovgames.github.io/official/`이며 `content/en/site.md`의 `site_url`에 설정되어 있습니다. 추후 커스텀 도메인을 사용하면 이 값만 변경하고 빌드합니다. 빌드 시 `SITE_URL` 환경변수로 재정의할 수도 있습니다. canonical·OG·Twitter 이미지·언어별 링크가 생성 HTML에 포함되므로 JavaScript 없이도 공유 정보를 읽을 수 있습니다.

1. `ovovgames/official` 저장소의 `main`에 프로젝트를 올립니다.
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 선택합니다.
3. 제공한 `.github/workflows/pages.yml`이 의존성 설치·테스트·빌드·정적 파일 업로드·배포를 수행합니다.
4. `Actions`에서 성공을 확인한 후 홈/목록/상세/프레스 영·한 직접 URL과 새로고침을 확인합니다.

배포용 `.cache/public`에는 HTML/CSS/JS/에셋만 포함됩니다. Markdown, node_modules, 테스트 파일은 업로드하지 않습니다. 수동 정적 호스팅용 파일은 `node scripts/stage.mjs`로 만들 수 있습니다. 이 작업에서는 GitHub 저장소 생성·push·실제 배포를 수행하지 않았습니다.

공식 절차 참고: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### 프레스킷 로고와 출시 시각

프레스킷 하단의 Official studio logos에서 가로형·정사각형 공식 로고를 개별 다운로드할 수 있습니다. 중복되는 About the Studio는 제거하고 프레스 연락처는 유지했습니다. 현재 게임의 release_display는 datetime으로 설정되어 KST·PT(PDT/PST)·UTC를 표시합니다. 게임 목록에는 날짜만 간결하게 표시합니다.

### 프레스킷에만 트레일러 추가

게임 목록·상세의 영상 설정은 그대로 두고 프레스킷에만 표시하려면 `content/en/press/{slug}.md`의 YAML에 설정합니다. 한국어에도 공유됩니다.

```yaml
trailer: https://youtu.be/RbFgYw_w2ko
trailer_download: assets/just-pancake-simulator/trailer.mp4
```

YouTube는 재생 버튼을 누를 때 임베드되며 MP4 원본은 다운로드 버튼을 누를 때만 요청합니다. 원본 영상은 전체 press.zip에도 포함됩니다. 로컬 영상 파일이 없으면 개별 다운로드 버튼은 숨겨집니다.

### 트레일러 썸네일과 상세 페이지

`content/en/press/just-pancake-simulator.md`의 `trailer_thumbnail`은 `assets/just-pancake-simulator/trailer-thumbnail.png`입니다. 현재 흰색 placeholder이며 실제 16:9 PNG로 교체한 뒤 빌드/새로고침하면 됩니다. 트레일러는 게임 목록에는 표시하지 않고, 게임 상세의 스크린샷 바로 위와 프레스킷에서 공유합니다. MP4 다운로드는 바이너리 Blob으로 저장해 미디어 뷰어 이동을 방지합니다.
