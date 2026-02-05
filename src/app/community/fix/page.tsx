"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "../../../components/BottomNav";
import { auth, db, checkIsAdmin } from "../../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function FixRoom() {
    const router = useRouter();
    const mainGreen = "#2D5A27";
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPosts = async () => {
            setLoading(true);

            const currentUser = auth.currentUser;
            if (!currentUser) {
                setLoading(false);
                return;
            }

            const isAdmin = checkIsAdmin(currentUser.email);
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const userRegion = userDoc.exists() ? userDoc.data().region : null;

            let q;

            if (isAdmin) {
                q = query(
                    collection(db, "posts"),
                    where("category", "==", "fix"),
                    orderBy("createdAt", "desc")
                );
            } else if (userRegion) {
                q = query(
                    collection(db, "posts"),
                    where("category", "==", "fix"),
                    where("region", "==", userRegion),
                    orderBy("createdAt", "desc")
                );
            } else {
                setPosts([]);
                setLoading(false);
                return;
            }

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPosts(postData);
                setLoading(false);
            }, (error) => {
                console.error("데이터 로드 에러:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        };

        loadPosts();
    }, []);

    const formatDateTime = (timestamp: any) => {
        if (!timestamp) return "방금 전";
        const date = timestamp.toDate();
        return date.toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const handleWriteClick = () => {
        if (!auth.currentUser) {
            alert("글을 쓰려면 로그인이 필요합니다! 😊");
            router.push("/login");
            return;
        }
        router.push("/community/write?type=fix");
    };

    return (
        <div style={{ background: "#FDFBF7", minHeight: "100vh", paddingBottom: "100px" }}>
            <header style={{ padding: "20px 5%", display: "flex", alignItems: "center", borderBottom: "1px solid #EEE", backgroundColor: "white", position: "sticky", top: 0, zIndex: 10 }}>
                <Link href="/" style={{ textDecoration: "none", fontSize: "1.5rem", marginRight: "15px" }}>🔙</Link>
                <h1 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0 }}>🆘 도와줘요</h1>
            </header>

            <section style={{ padding: "30px 5%", backgroundColor: "#FFEBEE" }}>
                <p style={{ margin: 0, fontWeight: "700", color: "#E53E3E" }}>급하게 도움이 필요한 이웃을 도와주세요! 🆘</p>
            </section>

            <main style={{ padding: "20px 5%" }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#AAA" }}>소식을 불러오는 중...</div>
                ) : posts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => router.push(`/community/${post.id}`)}
                                style={{ padding: "20px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #E8E3D8", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", cursor: "pointer" }}
                            >
                                <h3 style={{ fontSize: "1.1rem", margin: "0 0 10px 0", color: "#333", fontWeight: "800" }}>{post.title}</h3>
                                <p style={{ fontSize: "0.95rem", color: "#666", lineHeight: "1.5", marginBottom: "15px" }}>
                                    {post.content.length > 80 ? post.content.substring(0, 80) + "..." : post.content}
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#999" }}>
                                    <span>👤 {post.author} | 👁️ {post.views || 0}</span>
                                    <span>{formatDateTime(post.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#AAA" }}>아직 올라온 요청이 없어요.</div>
                )}
            </main>

            <div
                onClick={handleWriteClick}
                style={{
                    position: "fixed", right: "20px", bottom: "100px",
                    width: "60px", height: "60px", borderRadius: "50%",
                    backgroundColor: mainGreen, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "1.5rem", cursor: "pointer",
                    boxShadow: "0 5px 15px rgba(0,0,0,0.2)", zIndex: 100
                }}
            >
                ✏️
            </div>

            <BottomNav />
        </div>
    );
}
