// 여기서만 관리자 이메일을 수정하면 됩니다!
export const ADMIN_EMAILS = [
  "gas1730@gmail.com",
  "aramissss@nate.com", // 추가하고 싶은 이메일
  
];

// 관리자인지 확인해주는 똑똑한 도구
export const checkIsAdmin = (email: string | null | undefined) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};