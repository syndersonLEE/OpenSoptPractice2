# OpenSoptPractice2
OPEN SOPT #2 실습, 과제

#실습 
1. express 프로젝트 생성

2. routes에 training 폴더 생성
3. local:3000/training/info (GET)
 - csv 파일에 저장된 자신의 이름, 학교, 학과 정보 응답
 - Promise 사용
4. localhost:3000/training/info(POST)
  - 자신의 이름, 학교, 학과, 나이 정보 저장
  - async/await 사용

  #과제 
  1. express 프로젝트를 사용해주세요.
  2. 각 메소드는 promise나 async, async/await등 흐름제어를 사용해 주세요.
  3. 중복되는 코드들은 되도록이면 함수나 모듈로 빼서 작업해주세요. (권장사항)
  4. 성공/실패 시 각각 성동/실패 메세지를 보내주세요.
  5. 특히 실패할 때 어느 부분에서 길패하였는지 구체적으로 적어주세요
  6. 수정/삭제 시 게시글의 id가 존재하는지 확인하고,
    - 게시물의 비밀번호와 입력받은 비밀번호가 맞아야 수정/삭제가 가능합니다.
  5. 비밀번호가 틀렸을 때 실패 메세지를 보내주세요
  6. 해당 프로젝트를 생성한 EC2에 올려서 실행시켜주세요.