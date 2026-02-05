"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "../../firebase"; // 👈 이제 파이어베이스랑 연결됨!
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startPrice, setStartPrice] = useState(""); 
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. 로그인 체크
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      setUser(currentUser);
      // 로그인 확인되면 데이터 불러오기
      loadItemData(currentUser.uid); 
    });
    return () => unsubscribe();
  }, [id]);

  // 🔥 파이어베이스에서 데이터 가져오기
  const loadItemData = async (userId: string) => {
    try {
      const docRef = doc(db, "items", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("존재하지 않는 상품입니다.");
        router.push("/list");
        return;
      }

      const data = docSnap.data() as any; // 타입 에러 방지

      // 🔒 1. 본인 확인 (판매자 ID가 다르면 쫓아냄)
      if (data.sellerUid !== userId) {
        alert("작성자만 수정할 수 있습니다.");
        router.push(`/item/${id}`);
        return;
      }

      // 🔒 2. 입찰자 확인 (입찰이 있으면 수정 금지)
      // bids 배열이 있고, 길이가 0보다 크면 입찰자가 있는 것!
      if (data.bids && data.bids.length > 0) {
        alert("이미 입찰이 진행되어 내용을 수정할 수 없습니다.");
        router.push(`/item/${id}`);
        return;
      }

      // 데이터 채워넣기 (기존 내용 보여주기)
      setTitle(data.title);
      setDescription(data.description);
      setStartPrice(String(data.startPrice));
      setIsLoading(false);

    } catch (error) {
      console.error(error);
      alert("데이터를 불러오는데 실패했습니다.");
      router.push("/list");
    }
  };

  // 🔥 수정된 내용 저장하기
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("이대로 내용을 수정하시겠습니까?")) return;

    try {
      const docRef = doc(db, "items", id);
      
      // 제목과 설명만 수정 (가격 수정은 보통 막음)
      await updateDoc(docRef, {
        title: title,
        description: description,
      });

      alert("수정 완료되었습니다!");
      router.push(`/item/${id}`); // 상세 페이지로 이동
    } catch (error) {
      console.error(error);
      alert("수정 실패...");
    }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: "center" }}>데이터 불러오는 중... ⏳</div>;

  return (
    <main style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>상품 수정하기 ✏️</h1>
      
      <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* 제목 */}
        <div>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>제목</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 8 }} 
          />
        </div>

        {/* 시작가 (수정 불가 - 읽기 전용) */}
        <div>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>시작가 (수정불가)</label>
          <input 
            type="text" 
            value={startPrice} 
            disabled 
            style={{ width: "100%", padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#f9f9f9", color: "#888" }} 
          />
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>* 가격 변경은 불가능합니다.</p>
        </div>

        {/* 설명 */}
        <div>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>상세 설명</label>
          <textarea 
            rows={10} 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 8, resize: "none" }} 
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
            <button 
                type="button" 
                onClick={() => router.back()}
                style={{ flex: 1, padding: 15, background: "#888", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
                취소
            </button>
            <button 
                type="submit" 
                style={{ flex: 2, padding: 15, background: "#3182ce", color: "white", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
            >
                수정 완료
            </button>
            
        </div>

      </form>
    </main>
  );
}