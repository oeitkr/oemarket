"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// 📂 카테고리 목록
const CATEGORIES = ["디지털기기", "가구/인테리어", "의류/잡화", "뷰티/미용", "생활/주방", "스포츠/레저", "취미/게임", "도서/티켓", "자동차/오토바이", "자전거/킥보드", "기타"];

// 📷 이미지 압축 함수
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        if (img.width > MAX_WIDTH) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  });
};

export default function CreatePage() {
  const router = useRouter();

  const mainGreen = "#2D5A27";
  const bgGradient = "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)";
  const cardShadow = "0 10px 30px rgba(45, 90, 39, 0.05)";

  // --- [상태 관리 - 기존 모든 상태 유지] ---
 // --- [상태 관리 - 'giveaway(나눔)' 추가] ---
  const [saleMethod, setSaleMethod] = useState<"auction" | "minus" | "giveaway">("auction");
  const [category, setCategory] = useState("기타");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("1440");
  const [isCustom, setIsCustom] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [autoRelist, setAutoRelist] = useState(true);
  const [isMinusAuction, setIsMinusAuction] = useState(false);
  const [minDesiredPrice, setMinDesiredPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [myLocation, setMyLocation] = useState("위치 파악 중...");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // --- [기능 로직 - 기존과 동일] ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        router.replace("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 🥒 [수정됨] 네이버 지도가 로드될 때까지 기다렸다가 위치와 지도를 연결합니다.
  useEffect(() => {
    const initLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLatitude(latitude);
            setLongitude(longitude);

            const naver = (window as any).naver;

            // 🗺️ 네이버 지도 도구가 도착했는지 확인합니다.
            if (naver && naver.maps && naver.maps.Service) {
              // 주소 가져오기
              naver.maps.Service.reverseGeocode({
                coords: new naver.maps.LatLng(latitude, longitude),
              }, (status: any, response: any) => {
                if (status === naver.maps.Service.Status.OK) {
                  const area2 = response.v2.results[0].region.area2.name; // 구
                  const area3 = response.v2.results[0].region.area3.name; // 동
                  const fullAddr = `${area2} ${area3}`; // "동구 화정동"
                  setMyLocation(fullAddr || "위치 알 수 없음");
                }
              });

              // 📍 [중요] 실제 지도를 화면에 그리는 코드입니다.
              const mapOptions = {
                center: new naver.maps.LatLng(latitude, longitude),
                zoom: 15,
              };
              new naver.maps.Map("map", mapOptions); // "map"이라는 ID를 가진 div에 지도를 그려라!

            } else {
              // ⏳ 아직 네이버가 안 왔으면 0.5초 뒤에 다시 시도합니다.
              setTimeout(initLocation, 500);
            }
          },
          (error) => {
            console.error("위치 파악 실패:", error);
            setMyLocation("위치 정보를 허용해주세요 🥒");
          }
        );
      }
    };

    initLocation();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > 5) return alert("최대 5장까지 가능합니다.");
    setIsLoading(true);
    for (let i = 0; i < files.length; i++) {
      const compressed = await compressImage(files[i]);
      setImages((prev) => [...prev, compressed]);
    }
    setIsLoading(false);
  };

  const removeImage = (index: number) => {
    if (confirm("사진을 삭제하시겠습니까?")) setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return alert("제목을 입력해주세요.");

    // 🥒 [추가] 위치 정보 확인
    if (!latitude || !longitude || myLocation.includes("위치") || myLocation.includes("확인") || myLocation.includes("허용")) {
      if (confirm("📍 위치 정보가 필요합니다!\nGPS 권한을 허용하고 페이지를 새로고침 하시겠습니까? 🥒")) {
        window.location.reload(); // 페이지 새로고침
      }
      return;
    }

    const numPrice = price ? Number(price.replace(/,/g, "")) : 0;
    const numBuyNow = buyNowPrice ? Number(buyNowPrice.replace(/,/g, "")) : 0;
    const numMinPrice = minDesiredPrice ? Number(minDesiredPrice.replace(/,/g, "")) : 0;

    // 🥒 [수정] 입력한 가격에 따라 '20% 할인 마지노선'을 자동으로 계산합니다.
    if (isMinusAuction) {
      if (!numMinPrice || numMinPrice <= 0) {
        return alert("밀당경매를 하시려면 최소 희망가를 반드시 입력해야 합니다! 🥒");
      }

      // 시작가가 얼마든 그 금액의 80%(20% 할인된 금액)를 한계선으로 잡습니다.
      // 예: 100만 원 입력 시 -> 80만 원 / 5만 원 입력 시 -> 4만 원
      const limitPrice = numPrice * 0.8;

      if (numMinPrice > limitPrice) {
        return alert(
          `밀당경매는 시작가보다 최소 20% 이상 낮게 설정해야 합니다!\n` +
          `현재 시작가(${numPrice.toLocaleString()}원) 기준, \n` +
          `최소 희망가는 ${limitPrice.toLocaleString()}원 이하로만 설정 가능합니다. 🥒`
        );
      }
    }

    if (!confirm("오이마켓에 등록하시겠습니까? 🥒")) return;
    setIsLoading(true);
    try {
      const durationMin = Number(duration);
      const endTime = (saleMethod === "auction" || saleMethod === "minus") ? new Date(Date.now() + durationMin * 60 * 1000) : null;
      await addDoc(collection(db, "items"), {
        title, description, category, region: myLocation,
        latitude, longitude, isMinusAuction, images, type: saleMethod === "minus" ? "auction" : saleMethod,
        startPrice: numPrice, currentPrice: numPrice,
        minDesiredPrice: isMinusAuction ? numMinPrice : null,
        buyNowPrice: saleMethod === "auction" && numBuyNow > 0 ? numBuyNow : null,
        status: "active", createdAt: serverTimestamp(), endTime,
        durationMin: (saleMethod === "auction" || saleMethod === "minus") ? durationMin : 0,
relistCount: ((saleMethod === "auction" || saleMethod === "minus") && autoRelist) ? 2 : 0,
        sellerUid: user.uid, sellerNickname: user.displayName || "익명",
        sellerEmail: user.email, bidCount: 0, isSold: false, viewCount: 0, // 👈 이 줄을 추가하세요! (조회수 초기값)
        wishCount: 0, // 👈 이 줄을 추가하세요! (찜 수 초기값)
      });

      alert("보물 등록 완료! ✨");
      router.push("/list");
    } catch (error) { alert("등록 실패"); } finally { setIsLoading(false); }
  };

  // 공통 스타일
  const inputStyle = {
    width: "100%", padding: "14px", borderRadius: "14px", border: "1px solid #E0D7C6",
    background: "#FDFBF7", fontSize: "15px", outline: "none", marginBottom: "15px", color: "#333"
  };

  const labelStyle = {
    display: "block", fontSize: "14px", fontWeight: "700", color: mainGreen, marginBottom: "8px", marginLeft: "5px"
  };

  if (!user) return <div style={{ padding: 40, textAlign: "center", background: bgGradient, minHeight: "100vh" }}>로그인 확인 중... 🥒</div>;

  return (
    <main style={{ padding: "40px 15px", maxWidth: 1000, margin: "0 auto", background: bgGradient, minHeight: "100vh", paddingBottom: "100px" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
        <button type="button" onClick={() => router.back()} style={{ background: "white", border: "1px solid #E0D7C6", borderRadius: "10px", width: "45px", height: "45px", cursor: "pointer", fontSize: "18px" }}>⬅️</button>
        <h1 style={{ fontSize: 26, fontWeight: "800", color: mainGreen, margin: 0 }}>🥒상품 등록하기</h1>
      </div>

      <div style={{ display: "flex", maxWidth: 550, gap: 10, marginBottom: 25, background: "white", padding: "8px", borderRadius: "16px", boxShadow: cardShadow }}>
  <button type="button" onClick={() => { setSaleMethod("auction"); setIsMinusAuction(false); }} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: saleMethod === "auction" ? mainGreen : "transparent", color: saleMethod === "auction" ? "white" : "#A0AEC0", fontWeight: "bold", cursor: "pointer" }}>🔨 일반경매</button>
  
  <button type="button" onClick={() => { setSaleMethod("minus"); setIsMinusAuction(true); }} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: saleMethod === "minus" ? "#e53e3e" : "transparent", color: saleMethod === "minus" ? "white" : "#A0AEC0", fontWeight: "bold", cursor: "pointer" }}>🔥 밀당경매</button>

  {/* 🎁 나눔 버튼 추가: 파란색 계열로 포인트를 주었습니다. */}
  <button type="button" onClick={() => { setSaleMethod("giveaway"); setIsMinusAuction(false); }} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: saleMethod === "giveaway" ? "#4A90E2" : "transparent", color: saleMethod === "giveaway" ? "white" : "#A0AEC0", fontWeight: "bold", cursor: "pointer" }}>🎁 나눔</button>
</div>
      <form onSubmit={handleSubmit} className="responsive-form">
        <style jsx>{`
          .responsive-form {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 30px;
            background: white;
            padding: 30px;
            border-radius: 24px;
            box-shadow: ${cardShadow};
          }
          @media (max-width: 768px) {
            .responsive-form {
              grid-template-columns: 1fr;
              padding: 20px;
            }
          }
        `}</style>

        {/* [왼쪽] 사진 업로드 및 상세 설명 */}
        <div>
          <div style={{ marginBottom: 25 }}>
            <label style={labelStyle}>제품 사진 ({images.length}/5)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
              <label style={{ aspectRatio: "1/1", borderRadius: 16, border: `2px dashed #E0D7C6`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor: "pointer", background: "#FDFBF7", color: "#A0AEC0" }}>
                <span style={{ fontSize: "24px" }}>📷</span>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              {images.map((src, idx) => (
                <div key={idx} style={{ position: "relative", aspectRatio: "1/1" }}>
                  <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16, border: "1px solid #E0D7C6" }} />
                  <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: -5, right: -5, background: "#E53E3E", color: "white", borderRadius: "50%", width: 24, height: 24, border: "2px solid white", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <label style={labelStyle}>제목</label>
          <input type="text" placeholder="어떤 제품인가요?" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>상세 설명</label>
          <textarea rows={12} placeholder="물건의 상태를 자세히 알려주세요 🌱" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, resize: "none" }} />
        </div>

        {/* [오른쪽] 상품 정보 및 경매 설정 */}
        <div>
          <label style={labelStyle}>카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>

          {/* ✅ 가격 설정 구역: 나눔이 아닐 때만 보입니다. */}
          {saleMethod !== "giveaway" && (
            <div style={{ background: "#FDFBF7", padding: "20px", borderRadius: "18px", border: "1px solid #E0D7C6", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: "12px" }}>경매 시작가</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={price}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, "");
                      const numValue = Number(rawValue);
                      setPrice(numValue.toLocaleString());
                      if (isMinusAuction) {
                        const autoMinPrice = Math.floor(numValue * 0.8);
                        setMinDesiredPrice(autoMinPrice.toLocaleString());
                      }
                    }}
                    style={{ ...inputStyle, background: "white", marginBottom: 0 }}
                  />
                </div>
                {saleMethod === "minus" && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ ...labelStyle, fontSize: "12px", color: "#E53E3E" }}>최소 희망가 🔒</label>
                    </div>
                    <input
                      type="text"
                      placeholder="0"
                      value={minDesiredPrice}
                      onChange={(e) => setMinDesiredPrice(Number(e.target.value.replace(/[^0-9]/g, "")).toLocaleString())}
                      style={{ ...inputStyle, background: "white", border: "1px solid #FEB2B2", marginBottom: 0 }}
                    />
                  </div>
                )}
              </div>
              {saleMethod === "auction" && (
                <div style={{ marginTop: 15 }}>
                  <label style={{ ...labelStyle, fontSize: "12px" }}>즉시 구매가 (선택)</label>
                  <input type="text" placeholder="선택 사항" value={buyNowPrice} onChange={(e) => setBuyNowPrice(Number(e.target.value.replace(/[^0-9]/g, "")).toLocaleString())} style={{ ...inputStyle, background: "white", marginBottom: 0 }} />
                </div>
              )}
            </div>
          )}

          {/* ✅ 나눔 전용 안내 문구 */}
          {saleMethod === "giveaway" && (
            <div style={{ background: "#EBF8FF", padding: "20px", borderRadius: "18px", border: "1px solid #4A90E2", marginBottom: 20, textAlign: "center" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#2B6CB0" }}>🎁 나눔 상품은 0원으로 등록됩니다!</span>
            </div>
          )}

          {(saleMethod === "auction" || saleMethod === "minus") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 15, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>마감 시간</label>
                <select value={isCustom ? "custom" : duration} onChange={(e) => { if (e.target.value === "custom") { setIsCustom(true); setDuration(""); } else { setIsCustom(false); setDuration(e.target.value); } }} style={inputStyle} >
                  <option value="60">🕐 1시간</option>
                  <option value="1440">📅 24시간 (기본)</option>
                  <option value="4320">3일</option>
                  <option value="custom">✍️ 직접 입력</option>
                </select>
                {isCustom && (
                  <div style={{ position: "relative", marginTop: "-10px", marginBottom: "15px" }}>
                    <input
                      type="number"
                      placeholder="최소 30분"
                      min="30"
                      step="60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      style={{ ...inputStyle, border: `2px solid ${mainGreen}` }}
                    />
                    <span style={{ position: "absolute", right: "15px", top: "14px", color: "#A0AEC0" }}>분</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px", borderRadius: "12px", border: "1px solid #E0D7C6" }}>
                  <input type="checkbox" checked={autoRelist} onChange={(e) => setAutoRelist(e.target.checked)} style={{ width: 20, height: 20, accentColor: mainGreen }} />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>자동 재등록 (최대 2회)</span>
                </label>
              </div>
            </div>
          )}

          <div id="map" style={{ width: "100%", height: "200px", borderRadius: "16px", marginBottom: "15px", border: "1px solid #E0D7C6", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}></div>

          <div style={{ fontSize: "14px", color: mainGreen, fontWeight: "bold", marginBottom: "20px", textAlign: "right" }}>
            📍 현재 위치: {myLocation}
          </div>

          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "18px", background: isLoading ? "#E0D7C6" : mainGreen, color: "white", border: "none", borderRadius: "16px", fontSize: "17px", fontWeight: "800", cursor: "pointer" }}>
            {isLoading ? "상품 등록 중..." : "오이마켓에 제품 등록하기 🥒"}
          </button>
        </div>
      </form>
    </main>
  );
}