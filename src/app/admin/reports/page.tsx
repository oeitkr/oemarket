"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../firebase"; // 경로 확인 필요
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. 관리자 권한 체크 (내 이메일이나 UID로 설정 가능)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && (user.email === "aramissss@nate.com","gas1730@gmail.com")) { // 본인 이메일로 수정하세요
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. 신고 내역 실시간 불러오기
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    });
    return () => unsub();
  }, [isAdmin]);

  // 3. 유저 활동 정지 (suspended 상태로 변경)
  const suspendUser = async (uid: string, nickname: string) => {
    if (!confirm(`${nickname}님의 계정을 영구 정지하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        status: "suspended"
      });
      alert("해당 유저의 활동이 정지되었습니다.");
    } catch (e) {
      alert("정지 처리 중 오류 발생 (유저 문서가 없는 경우 등)");
    }
  };

  // 4. 신고 내역 삭제 (검토 완료)
  const deleteReport = async (reportId: string) => {
    if (!confirm("이 신고 내역을 목록에서 지우시겠습니까?")) return;
    await deleteDoc(doc(db, "reports", reportId));
  };

  if (loading) return <div style={{ padding: 50, textAlign: "center" }}>권한 확인 중...</div>;
  if (!isAdmin) return <div style={{ padding: 50, textAlign: "center", color: "red" }}>접근 권한이 없습니다.</div>;

  return (
    <main style={{ padding: "30px 20px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>🚨 신고 관리 센터</h1>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {reports.length === 0 && <p>접수된 신고가 없습니다.</p>}
        
        {reports.map((r) => (
          <div key={r.id} style={{ padding: "20px", border: "1px solid #eee", borderRadius: "12px", background: "#fcfcfc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>
                {r.createdAt?.toDate().toLocaleString() || "날짜 정보 없음"}
              </span>
              <span style={{ color: "#e53e3e", fontWeight: "bold" }}>사유: {r.reason}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <p><strong>신고자:</strong> {r.reporterUid} (익명)</p>
              <p><strong>신고 대상:</strong> <span style={{ color: "#3182ce" }}>{r.reportedNickname}</span> ({r.reportedUid})</p>
              <p><strong>관련 상품 ID:</strong> {r.itemId}</p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => suspendUser(r.reportedUid, r.reportedNickname)}
                style={{ flex: 1, padding: "10px", background: "#e53e3e", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                🚫 유저 즉시 정지
              </button>
              <button 
                onClick={() => deleteReport(r.id)}
                style={{ flex: 1, padding: "10px", background: "#718096", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                ✅ 신고 확인 완료 (삭제)
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}