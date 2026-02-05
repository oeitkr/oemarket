"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "../../firebase"; // 🥒 auth 추가
import { onAuthStateChanged } from "firebase/auth"; // 🥒 로그인 확인용 추가
import { doc, getDoc, updateDoc } from "firebase/firestore"; // 🥒 updateDoc 추가
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { BottomNav } from "../../../components/BottomNav";
import { checkIsAdmin } from "../../adminConfig"; // 🥒 관리자 확인 도구 추가

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // 🥒 1. 데이터 관련 이름표
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 🥒 2. 수정 모드 관련 이름표 (이 6줄이 세트입니다!)
  const [isEditing, setIsEditing] = useState(false); 
  const [editTitle, setEditTitle] = useState(""); 
  const [editContent, setEditContent] = useState(""); 
  const [newImageFile, setNewImageFile] = useState<File | null>(null); // 새 사진 파일
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 미리보기 주소
  const [isImageDeleted, setIsImageDeleted] = useState(false); // 사진 삭제 여부 (추가됨!)

  // 🥒 3. 기타 화면 제어
  const [isNoticePhotoOpen, setIsNoticePhotoOpen] = useState(false);
  const isAdmin = checkIsAdmin(user?.email);
// ...
  // 디자인 컬러
  const mainGreen = "#2D5A27";
  const bgGradient = "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)";

  // 📍 1. 데이터 가져오기 로직 (에러 방지를 위해 감시 항목을 params.id로 고정)
  useEffect(() => {
    const fetchNotice = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, "notices", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setNotice({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert("존재하지 않는 공지사항입니다. 🥒");
          router.push("/notice");
        }
      } catch (error) {
        console.error("공지 가져오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotice();
  }, [params.id]); // 👈 [체크!] 항목 개수를 고정해서 'Size changed' 에러를 막았습니다.


  // 🥒 [여기에 추가됨] 로그인 확인 기능과 수정 시작 버튼 기능입니다.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);
// ✅ [이걸로 바꾸세요!] 사진까지 완벽하게 처리하는 새 코드입니다.
  const handleUpdateNotice = async () => {
    if (!editTitle.trim() || !editContent.trim()) return alert("제목과 내용을 입력해주세요! 🥒");

    try {
      setLoading(true);
      const storage = getStorage(); // 📸 사진 창고 열기
      const docRef = doc(db, "notices", params.id as string);
      
      // 일단 지금 사진 주소를 가져옵니다.
      let finalImageUrl = notice?.imageUrls?.[0] || notice?.imageUrl || ""; 

      // 1. 사진을 삭제하기로 했으면 주소를 비웁니다.
      if (isImageDeleted) {
        finalImageUrl = "";
      } 
      // 2. 새 사진을 골랐으면 서버에 올리고 새 주소를 받습니다.
      else if (newImageFile) {
        const storageRef = ref(storage, `notices/${params.id}_${Date.now()}`);
        await uploadBytes(storageRef, newImageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      // 3. 파이어베이스 DB에 최종 보고 (글자 + 사진주소)
      await updateDoc(docRef, {
        title: editTitle,
        content: editContent,
        imageUrls: finalImageUrl ? [finalImageUrl] : [], // 배열도 업데이트
        imageUrl: finalImageUrl // 단수형도 업데이트
      });

      // 4. 내 화면도 새 정보로 교체
      setNotice({ 
        ...notice, 
        title: editTitle, 
        content: editContent, 
        imageUrls: finalImageUrl ? [finalImageUrl] : [],
        imageUrl: finalImageUrl 
      });
      
      // 5. 마무리 청소
      setIsEditing(false);
      setNewImageFile(null);
      setImagePreview(null);
      setIsImageDeleted(false);
      alert("사진까지 완벽하게 수정되었습니다! ✨");

    } catch (error) {
      console.error("수정 실패:", error);
      alert("저장에 실패했습니다. 😢");
    } finally {
      setLoading(false);
    }
  };

  // 🥒 [수정됨] 수정을 시작할 때 모든 사진 상태를 초기화해서 꼬임을 방지합니다.
  const handleStartEdit = () => {
    setEditTitle(notice?.title || "");
    setEditContent(notice?.content || "");
    
    // 📸 사진 관련 상태 초기화 (이게 빠져서 사진이 안 바뀌었던 거예요!)
    setNewImageFile(null);
    setImagePreview(null);
    setIsImageDeleted(false); 
    
    setIsEditing(true);
  };
  // 🥒 [추가] 사진 선택 시 실행되는 함수
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file); // 실제 파일 저장
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string); // 화면에 보여줄 미리보기 주소 저장
      };
      reader.readAsDataURL(file);
    }
  };

  // 로딩 화면
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: bgGradient }}>
      <div style={{ textAlign: "center", color: mainGreen, fontWeight: "bold" }}>🥒 내용을 불러오고 있어요...</div>
    </div>
  );

  return (
    <div style={{ background: bgGradient, minHeight: "100vh", paddingBottom: "100px" }}>
      {/* 1. 상단 헤더 (뒤로가기 버튼 포함) */}
      <header style={{ padding: "20px", display: "flex", alignItems: "center", background: "white", borderBottom: "1px solid #E0D7C6" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", marginRight: "15px" }}>
          ⬅️
        </button>
        
        {/* 🥒 제목은 왼쪽으로 밀고, 옆에 수정 버튼을 넣었습니다. */}
        <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#333", margin: 0, flex: 1 }}>공지사항 상세</h1>
        
        {isAdmin && !isEditing && (
          <button 
            onClick={handleStartEdit}
            style={{ background: "#F0F4F8", border: "none", padding: "6px 12px", borderRadius: "8px", color: mainGreen, fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
          >
            수정
          </button>
        )}
      </header>

      {/* 2. 본문 영역 */}
      <main style={{ padding: "25px 20px" }}>
        <article style={{ background: "white", borderRadius: "24px", padding: "25px", boxShadow: "0 8px 20px rgba(0,0,0,0.03)", border: "1px solid rgba(224, 215, 198, 0.4)" }}>
                             
          {isEditing ? (
            /* 🥒 [수정 모드] 글을 고칠 수 있는 입력창들이 나타납니다. */
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "12px", border: `2px solid ${mainGreen}`, fontSize: "18px", fontWeight: "bold", outline: "none" }}
                placeholder="제목을 입력하세요"
              />
              <textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)}
                style={{ width: "100%", height: "300px", padding: "12px", borderRadius: "12px", border: "1px solid #E0D7C6", fontSize: "16px", lineHeight: "1.6", outline: "none", resize: "none" }}
                placeholder="내용을 입력하세요"
              />
              {/* 🥒 [추가] 사진 수정 구역 */}
              <div style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "14px", fontWeight: "bold", color: "#666", marginBottom: "8px" }}>📸 사진 수정</p>
                <div style={{ position: "relative", width: "100px", height: "100px" }}>
                  <img 
                    src={imagePreview || notice?.imageUrls?.[0] || notice?.imageUrl || "https://via.placeholder.com/100"} 
                    alt="미리보기" 
                    style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "12px", border: "1px solid #ddd" }}
                  />
                  <label 
                    htmlFor="notice-photo-edit"
                    style={{ 
                      position: "absolute", bottom: "-5px", right: "-5px", background: mainGreen, color: "white", 
                      width: "30px", height: "30px", borderRadius: "50%", display: "flex", justifyContent: "center", 
                      alignItems: "center", cursor: "pointer", fontSize: "16px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                    }}
                  >
                    🔄
                  </label>
                  <input 
                    id="notice-photo-edit" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    style={{ display: "none" }} 
                  />
                </div>
                {newImageFile && <p style={{ fontSize: "12px", color: mainGreen, marginTop: "5px" }}>✅ 새 사진이 선택되었습니다.</p>}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#eee", border: "none", fontWeight: "bold", cursor: "pointer" }}>취소</button>
                <button onClick={handleUpdateNotice} style={{ flex: 2, padding: "12px", borderRadius: "10px", background: mainGreen, color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>수정 완료</button>
              </div>
            </div>
          ) : (
            /* 🥒 [보기 모드] 원래 있던 제목과 본문 내용입니다. */
            <>
              {/* 제목 구역 */}
              <div style={{ borderBottom: "1px solid #F0EBE0", paddingBottom: "15px", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: mainGreen, fontWeight: "700", display: "block", marginBottom: "8px" }}>📢 오이마켓 소식</span>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#333", margin: "0 0 10px 0", lineHeight: "1.4" }}>
                  {notice?.title}
                </h2>
                <div style={{ fontSize: "13px", color: "#999" }}>
                  📅 {notice?.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : "2026. 1. 23."}
                </div>
              </div>

              {/* 내용 구역 (텍스트 먼저 + 사진 나중에) */}
              <div style={{ fontSize: "16px", color: "#4A5568", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                {notice?.content || "내용이 없습니다."}

                {(notice?.imageUrls?.[0] || notice?.imageUrl) && (
                  <div style={{ marginTop: "25px", textAlign: "center" }}>
                    <img 
                      src={notice.imageUrls?.[0] || notice.imageUrl} 
                      onClick={() => setIsNoticePhotoOpen(true)} 
                      alt="공지 이미지" 
                      style={{ width: "100%", maxWidth: "500px", height: "auto", borderRadius: "16px", border: "1px solid #F0EBE0", display: "block", margin: "0 auto", cursor: "zoom-in" }} 
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </article>
         

        {/* 하단 버튼 */}
        <button 
          onClick={() => router.push("/notice")}
          style={{ 
            width: "100%", marginTop: "20px", padding: "15px", borderRadius: "16px", 
            background: mainGreen, color: "white", border: "none", 
            fontWeight: "700", fontSize: "15px", cursor: "pointer" 
          }}
        >
          목록으로 돌아가기
        
        </button>
      </main>

      {/* 🥒 [추가] 공지 사진을 화면 가득 채우는 로직입니다. */}
      {isNoticePhotoOpen && (
        <div 
          onClick={() => setIsNoticePhotoOpen(false)} 
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.95)", // 아주 진한 검은색 배경
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            zIndex: 3000, cursor: "zoom-out"
          }}
        >
          {/* 📸 리스트(imageUrls)에 있는 첫 번째 사진을 시원하게 키웁니다! */}
          <img 
            src={notice.imageUrls?.[0] || notice.imageUrl} 
            alt="공지 크게보기" 
            style={{ 
              width: "90%", 
              maxWidth: "600px", 
              height: "auto", 
              borderRadius: "15px", 
              boxShadow: "0 20px 60px rgba(0,0,0,1)",
              border: "3px solid white" // 테두리를 줘서 더 돋보이게!
            }} 
          />
          <div style={{ color: "white", marginTop: "25px", fontWeight: "900", fontSize: "18px" }}>
            터치하면 닫힙니다 ✖️
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <BottomNav />
    </div>
  );
}