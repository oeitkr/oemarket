"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth, storage, checkIsAdmin } from "../../firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NoticeWritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  // 📍 1. 사진 3장을 담을 바구니 (배열)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const mainGreen = "#2D5A27";

  // 관리자 체크
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && checkIsAdmin(user)) {
        setIsAdmin(true);
      } else if (user) {
        alert("관리자만 들어올 수 있는 페이지입니다! 🥒");
        router.push("/notice");
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // 📍 2. 사진 압축 함수 (용량을 줄여서 파이어베이스를 아낍니다)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // 최대 가로 크기 1024px로 제한
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 0.7은 화질(70%)입니다. 용량과 화질의 적정선이에요.
          canvas.toBlob((blob) => { if (blob) resolve(blob); }, "image/jpeg", 0.7);
        };
      };
    });
  };

  // 📍 3. 사진 선택 시 실행 (최대 3장 제한)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 3) {
      return alert("사진은 최대 3장까지만 올릴 수 있습니다! 🥒");
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  // 사진 삭제 함수
  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // 📍 4. 등록 버튼 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요!");

    setLoading(true);
    try {
      const imageUrls: string[] = [];

      // 여러 장의 사진을 하나씩 압축하고 업로드합니다.
      for (const file of imageFiles) {
        const compressedBlob = await compressImage(file); // 압축 실행!
        const filename = `notices/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filename);
        
        const snapshot = await uploadBytes(storageRef, compressedBlob);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      await addDoc(collection(db, "notices"), {
        title,
        content,
        imageUrls, // 📍 이제 주소가 여러 개인 배열로 저장됩니다.
        createdAt: serverTimestamp(),
        author: "관리자",
      });

      alert("공지사항이 등록되었습니다! ✨");
      router.push("/notice");
    } catch (err) {
      console.error(err);
      alert("등록 실패!");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return <div style={{ padding: 50, textAlign: "center" }}>권한 확인 중... 🕵️</div>;

  return (
    <main style={{ padding: "20px 15px", maxWidth: "600px", margin: "0 auto", background: "#FDFBF7", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: mainGreen, marginBottom: "25px" }}>📢 공지사항 작성 (최대 3장)</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input
          type="text" placeholder="공지 제목" value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: "15px", borderRadius: "12px", border: "1px solid #E0D7C6" }}
        />

        {/* 사진 선택 구역 */}
        <div style={{ padding: "20px", border: "2px dashed #E0D7C6", borderRadius: "12px", background: "white", textAlign: "center" }}>
          <label style={{ cursor: "pointer" }}>
            <span style={{ fontSize: "15px", color: "#666", fontWeight: "bold" }}>📷 사진 추가 ({imageFiles.length}/3)</span>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          
          <div style={{ display: "flex", gap: "10px", marginTop: "15px", justifyContent: "center" }}>
            {imagePreviews.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                <button type="button" onClick={() => removeImage(i)} style={{ position: "absolute", top: "-5px", right: "-5px", background: "red", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "12px" }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <textarea
          placeholder="내용을 입력하세요" value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ padding: "15px", borderRadius: "12px", border: "1px solid #E0D7C6", minHeight: "250px", resize: "none" }}
        />
        
        <button type="submit" disabled={loading} style={{ padding: "15px", borderRadius: "12px", background: mainGreen, color: "white", fontWeight: "bold", opacity: loading ? 0.7 : 1 }}>
          {loading ? "압축 및 업로드 중..." : "공지 등록하기"}
        </button>
      </form>
    </main>
  );
}