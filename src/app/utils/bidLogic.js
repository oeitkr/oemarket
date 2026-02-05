/**
 * 현재 가격에 따라 입찰 단위를 계산해주는 함수
 * (반드시 앞에 export가 있어야 다른 파일에서 쓸 수 있습니다!)
 */
export const getBidIncrement = (currentPrice) => {
  if (currentPrice >= 1000000) {
    return 50000; // 100만 원 이상 -> 5만 원 단위
  } else if (currentPrice >= 500000) {
    return 10000; // 50만 ~ 100만 미만 -> 1만 원 단위
  } else if (currentPrice >= 100000) {
    return 5000;  // 10만 ~ 50만 미만 -> 5천 원 단위
  } else if (currentPrice >= 10000) {
    return 1000;  // 1만 ~ 10만 미만 -> 1천 원 단위
  } else {
    return 1000;  // 1만 원 미만 -> 1천 원 단위 (잔돈 방지)
  }
};

/**
 * 다음 입찰에 필요한 최소 금액을 계산해주는 함수
 */
export const getNextMinBid = (currentPrice) => {
  const increment = getBidIncrement(currentPrice);
  return currentPrice + increment;
};