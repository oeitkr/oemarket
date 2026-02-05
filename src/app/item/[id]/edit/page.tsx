"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "../../../firebase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp } from "firebase/app"; 
// 📉 압축 라이브러리 추가
import imageCompression from "browser-image-compression";

export default function EditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  // 저장소 연결
  const storage = getStorage(getApp());

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); 
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startPrice, setStartPrice] = useState(0);
  
  const [existingImages, setExistingImages] = useState<string[]>([]); 
  const [newFiles, setNewFiles] = useState<File[]>([]); 
  
  const [duration, setDuration] = useState<number>(1440); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "items", id);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setStartPrice(data.startPrice || 0);
          
          if (data.images && Array.isArray(data.images)) {
            setExistingImages(data.images);
          }
        } else {
          alert("상품 정보를 찾을 수 없습니다.");
          router.back();
        }
      } catch (e) {
        console.error("불러오기 실패", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeExistingImage = (indexToRemove: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeNewFile = (indexToRemove: number) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 📉 이미지 압축 함수
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 0.5, // ✅ 500KB 이하로 제한
      maxWidthOrHeight: 1920, // 너무 큰 해상도는 줄임
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (e) {
      console.log("압축 실패, 원본 사용", e);
      return file;
    }
  };

  const handleUpdate = async () => {
      if (!title.trim()) return alert("제목을 입력해주세요.");
      if (startPrice < 0) return alert("가격은 0원 이상이어야 합니다.");
      if (confirm("이대로 수정하시겠습니까?") === false) return;

      setIsUploading(true);

      try {
          const docRef = doc(db, "items", id);
          
          let uploadedImageUrls: string[] = [];
          if (newFiles.length > 0) {
            uploadedImageUrls = await Promise.all(
              newFiles.map(async (file) => {
                // 1️⃣ 업로드 전 압축 실행
                const compressedFile = await compressImage(file);
                
                // 2️⃣ 압축된 파일 업로드
                const storageRef = ref(storage, `items/${id}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, compressedFile);
                return await getDownloadURL(storageRef);
              })
            );
          }

          const finalImages = [...existingImages, ...uploadedImageUrls];

          const now = new Date();
          const newEndTime = new Date(now.getTime() + duration * 60 * 1000);

          const updateData: any = {
              title,
              description,
              startPrice: Number(startPrice),
              endTime: newEndTime, 
              images: finalImages, 
          };

          await updateDoc(docRef, updateData);
          
          alert(`수정 완료! ${duration}분 뒤에 종료됩니다. ⏱️`);
          router.push(`/item/${id}`); 
          
      } catch (e) {
          console.error(e);
          alert("저장 중 오류가 발생했습니다.");
      } finally {
          setIsUploading(false);
      }
  };

  if (loading) return <div className="p-10 text-center">로딩중...</div>;

  return (
    <main style={{ padding: 20, maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>상품 수정 / 재등록 ✏️</h1>

      {isUploading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, flexDirection: "column" }}>
            <div style={{ fontSize: 20, fontWeight: "bold" }}>사진 압축 및 업로드 중...</div>
            <div>잠시만 기다려주세요.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        
        <div style={{ border: "1px solid #ddd", padding: 15, borderRadius: 8 }}>
            <label style={{ display: "block", marginBottom: 10, fontWeight: "bold" }}>상품 이미지</label>
            
            <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleFileSelect}
                style={{ marginBottom: 10 }}
            />

            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 5 }}>
                {existingImages.map((src, idx) => (
                    <div key={`existing-${idx}`} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={src} alt="existing" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #ddd" }} />
                        <button 
                            onClick={() => removeExistingImage(idx)}
                            style={{ position: "absolute", top: -5, right: -5, background: "red", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 12 }}>
                            X
                        </button>
                    </div>
                ))}

                {newFiles.map((file, idx) => (
                    <div key={`new-${idx}`} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={URL.createObjectURL(file)} alt="new" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #3182ce" }} />
                        <button 
                            onClick={() => removeNewFile(idx)}
                            style={{ position: "absolute", top: -5, right: -5, background: "red", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 12 }}>
                            X
                        </button>
                        <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(49, 130, 206, 0.8)", color: "white", fontSize: 10, textAlign: "center" }}>NEW</span>
                    </div>
                ))}
            </div>
            <p style={{ fontSize: 12, color: "#888", marginTop: 5 }}>* 빨간 X 버튼을 누르면 목록에서 제외됩니다.</p>
        </div>

        <div>
            <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>상품 제목</label>
            <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
        </div>

        <div>
            <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>시작 가격</label>
            <input 
                type="number" 
                value={startPrice}
                onChange={(e) => setStartPrice(Number(e.target.value))}
                style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
        </div>

        <div>
            <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>상품 설명</label>
            <textarea 
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
        </div>

        <div style={{ background: "#ebf8ff", padding: 15, borderRadius: 8, border: "1px solid #bee3f8" }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold", color: "#2b6cb0" }}>
                ⏳ 진행 시간 선택 (수정 시점부터)
            </label>
            <select 
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ width: "100%", padding: 12, border: "1px solid #cbd5e0", borderRadius: 8, fontSize: 16, background: "white", cursor: "pointer" }}
            >
                <option value={3}>3분 (테스트용)</option>
                <option value={5}>5분</option>
                <option value={10}>10분</option>
                <option value={30}>30분</option>
                <option value={60}>1시간</option>
                <option value={180}>3시간</option>
                <option value={360}>6시간</option>
                <option value={720}>12시간</option>
                <option value={1440}>1일 (24시간)</option>
                <option value={4320}>3일</option>
                <option value={10080}>7일 (일주일)</option>
            </select>
        </div>

        <button 
            onClick={handleUpdate}
            disabled={isUploading}
            style={{ 
                marginTop: 20, padding: 15, 
                background: isUploading ? "#a0aec0" : "#3182ce", 
                color: "white", 
                border: "none", borderRadius: 8, 
                fontSize: 16, fontWeight: "bold", cursor: isUploading ? "not-allowed" : "pointer" 
            }}
        >
            {isUploading ? "저장 중..." : "수정 완료 및 시작"}
        </button>

        <button 
            onClick={() => router.back()}
            disabled={isUploading}
            style={{ 
                padding: 15, background: "#edf2f7", color: "#4a5568", 
                border: "none", borderRadius: 8, cursor: "pointer" 
            }}
        >
            취소
        </button>

      </div>
    </main>
  );
}