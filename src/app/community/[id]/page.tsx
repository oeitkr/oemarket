"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth, checkIsAdmin } from "../../firebase";
import {
  doc, getDoc, deleteDoc, updateDoc, increment, arrayUnion,
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy
} from "firebase/firestore";
import { BottomNav } from "../../../components/BottomNav";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mainGreen = "#2D5A27";

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");

  const hasExecuted = useRef(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id || hasExecuted.current) return;
      hasExecuted.current = true;

      try {
        const docRef = doc(db, "posts", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const userId = auth.currentUser?.uid;

          if (userId && !data.viewedBy?.includes(userId)) {
            await updateDoc(docRef, {
              views: increment(1),
              viewedBy: arrayUnion(userId)
            });
            data.views = (data.views || 0) + 1;
          }

          setPost({ id: docSnap.id, ...data });
          setEditTitle(data.title);
          setEditContent(data.content);

          const commentsQuery = query(
            collection(db, "posts", params.id as string, "comments"),
            orderBy("createdAt", "asc")
          );

          const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const commentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(commentData);
          });

          return () => unsubscribeComments();
        } else {
          alert("존재하지 않는 게시글입니다.");
          router.push("/community/news");
        }
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [params.id]);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "방금 전";
    const date = timestamp.toDate();
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    if (!confirm("정말 이 글을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "posts", params.id as string));
      alert("글이 삭제되었습니다.");
      router.push("/community/news");
    } catch (error) { alert("삭제 실패"); }
  };

  const handleUpdate = async () => {
    try {
      const docRef = doc(db, "posts", params.id as string);
      await updateDoc(docRef, { title: editTitle, content: editContent });
      setPost({ ...post, title: editTitle, content: editContent });
      setIsEditing(false);
      alert("글이 수정되었습니다.");
    } catch (error) { alert("수정 실패"); }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "posts", params.id as string, "comments"), {
        content: commentInput,
        author: auth.currentUser.displayName || "익명",
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setCommentInput("");
    } catch (error) {
      alert("댓글 등록에 실패했습니다.");
    }
  };

  // 💬 [추가] 댓글을 삭제하는 실제 명령어(함수)입니다.
  const handleCommentDelete = async (commentId: string, commentUid: string) => {
    // 1. 본인 또는 관리자인지 권한 확인
    const isAdmin = checkIsAdmin(auth.currentUser?.email);
    const isMyComment = auth.currentUser?.uid === commentUid;

    if (!isMyComment && !isAdmin) {
      alert("삭제 권한이 없습니다.");
      return;
    }

    if (!confirm("댓글을 정말 삭제하시겠습니까?")) return;

    try {
      // 2. 데이터베이스에서 해당 댓글을 찾아 삭제합니다.
      await deleteDoc(doc(db, "posts", params.id as string, "comments", commentId));
      alert("댓글이 삭제되었습니다.");
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div style={{ padding: 100, textAlign: "center", background: "#FDFBF7", minHeight: "100vh" }}>⏳ 소식을 불러오고 있어요...</div>;
  if (!post) return null;

  const isAdmin = checkIsAdmin(auth.currentUser);
  const isMyPost = auth.currentUser?.uid === post.uid;
  const canManage = isMyPost || isAdmin;

  return (
    <div style={{ background: "#FDFBF7", minHeight: "100vh", paddingBottom: "100px" }}>
      <main style={{ padding: "20px 5%", maxWidth: "800px", margin: "0 auto" }}>
        <button
          onClick={() => router.push("/community/news")}
          style={{ marginBottom: "25px", background: "none", border: "none", color: mainGreen, cursor: "pointer", fontSize: "1.1rem", fontWeight: "800" }}
        >
          🔙 목록으로
        </button>

        <div style={{ background: "white", padding: "35px 30px", borderRadius: "28px", border: "1px solid #E8E3D8", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #DDD", fontSize: "1.2rem" }} />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ minHeight: "300px", padding: "12px", borderRadius: "8px", border: "1px solid #DDD", fontSize: "1rem" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleUpdate} style={{ flex: 1, padding: "12px", background: mainGreen, color: "white", border: "none", borderRadius: "8px", fontWeight: "800" }}>저장하기</button>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: "12px", background: "#EEE", border: "none", borderRadius: "8px" }}>취소</button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: "#333", marginBottom: "15px" }}>{post.title}</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", color: "#999", marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #F5F0E8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: "600" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span>👤 {post.author}</span>
                    {post.region && <span style={{ fontSize: "0.85rem", color: mainGreen }}>📍 {post.region}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                    {canManage && (
                      <div style={{ display: "flex", gap: "8px", fontSize: "0.75rem" }}>
                        <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: 0 }}>수정</button>
                        <span style={{ color: "#DDD" }}>|</span>
                        <button onClick={handleDelete} style={{ background: "none", border: "none", color: "#FF5252", cursor: "pointer", padding: 0 }}>삭제</button>
                      </div>
                    )}
                    <span>📅 {formatDateTime(post.createdAt)}</span>
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", textAlign: "right" }}>
                  👁️ 읽은 수 {post.views || 0}
                </div>
              </div>
              <div style={{ fontSize: "1.1rem", lineHeight: "1.8", color: "#444", whiteSpace: "pre-wrap", minHeight: "200px" }}>{post.content}</div>

              {/* 💬 댓글 영역 */}
              <div style={{ marginTop: "40px", borderTop: "1px solid #EEE", paddingTop: "30px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "20px" }}>💬 댓글 {comments.length}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ paddingBottom: "15px", borderBottom: "1px solid #F9F9F9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{comment.author}</span>
                        {/* 🗑️ [추가] 댓글 삭제 버튼입니다. 내 글이거나 관리자일 때만 보입니다. */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {(auth.currentUser?.uid === comment.uid || checkIsAdmin(auth.currentUser?.email)) && (
                            <button
                              onClick={() => handleCommentDelete(comment.id, comment.uid)}
                              style={{ background: "none", border: "none", color: "#FF5252", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}
                            >
                              삭제
                            </button>
                          )}
                          <span style={{ fontSize: "0.75rem", color: "#BBB" }}>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#BBB" }}>{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: "0.95rem", color: "#555", margin: 0 }}>{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && <p style={{ color: "#AAA", fontSize: "0.9rem", textAlign: "center" }}>첫 번째 댓글을 남겨보세요! 🥒</p>}
                </div>

                <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: "10px" }}>
                  <input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="이웃에게 따뜻한 댓글을 남겨주세요 🥒"
                    style={{ flex: 1, padding: "12px 15px", borderRadius: "12px", border: "1px solid #DDD", outline: "none", fontSize: "0.95rem" }}
                  />
                  <button type="submit" style={{ padding: "10px 20px", background: mainGreen, color: "white", border: "none", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>등록</button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}