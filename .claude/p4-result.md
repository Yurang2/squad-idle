P4 코드 준비는 완료했지만 Android 빌드는 환경에 막혔습니다.

- Capacitor 설정, 웹 복사·에셋 검사, 아이콘/스플래시 생성기, 네이티브 연동 추가
- 기존 테스트 **38개**, 브라우저·모의 네이티브 검증 통과
- npm 접근 `EACCES`로 `android/` 생성 실패. JDK/SDK도 없어 **APK는 생성되지 않았습니다.**

재개 명령과 설치 요구사항은 [BUILD_ANDROID.md](D:/Git/Inv/squad-idle/BUILD_ANDROID.md), 결정과 결과는 [CHANGELOG.md](D:/Git/Inv/squad-idle/CHANGELOG.md)에 기록했습니다.