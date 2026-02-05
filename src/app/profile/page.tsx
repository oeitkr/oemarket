"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    collection, query, where, getDocs, doc, getDoc,
    onSnapshot, updateDoc, setDoc, getCountFromServer, increment
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { BottomNav } from "../../components/BottomNav";
import { checkIsAdmin } from "../adminConfig";
// 다른 import 들 사이에 끼워주세요.
import imageCompression from 'browser-image-compression'; // 👈 압축 도구 소환!
export default function MyProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [myItems, setMyItems] = useState<any[]>([]);
    const [participatedItems, setParticipatedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [isEditing, setIsEditing] = useState(false);
    const [newNickname, setNewNickname] = useState("");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [chatRooms, setChatRooms] = useState<any[]>([]);
    const [chatSettings, setChatSettings] = useState<any>({});
    const [viewMode, setViewMode] = useState<"active" | "archived">("active");
    // 📍 [추가] 25번 줄 근처
    const [region, setRegion] = useState("미인증");
    const [isVerifying, setIsVerifying] = useState(false);
    const [imgFile, setImgFile] = useState<File | null>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isBidNotifOpen, setIsBidNotifOpen] = useState(false); // 👈 [추가] 입찰 알림 상자용 스위치 (처음엔 열어둠)
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMyItemsOpen, setIsMyItemsOpen] = useState(false);
    const [isBiddingOpen, setIsBiddingOpen] = useState(false);
    const [isWonOpen, setIsWonOpen] = useState(false);

    const [adminStats, setAdminStats] = useState({
        userCount: 0, itemCount: 0, soldCount: 0, todayVisits: 0, totalVisits: 0
    });

    const router = useRouter();
    const isAdmin = checkIsAdmin(user?.email);
    const mainGreen = "#2D5A27";
    const warmBeige = "#FDFBF7";
    const [unreadCount, setUnreadCount] = useState<number>(0);
    // 🔔 [실시간 알림 일꾼] 데이터베이스를 지켜보다가 숫자를 업데이트합니다.
    useEffect(() => {
        // 1. 로그인이 안 되어 있으면 일을 하지 않습니다.
        if (!user?.uid) return;

        // 2. 내 알림 서랍장 중에서 'isRead'가 false(안 읽음)인 것만 골라내는 규칙
        const q = query(
            collection(db, "users", user.uid, "notifications"),
            where("isRead", "==", false)
        );

        // 3. 실시간 감시 시작 (변화가 생기면 바로 실행됨)
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // 4. 안 읽은 서류가 몇 개인지 세어서 바구니에 담습니다.
            setUnreadCount(snapshot.docs.length);
        });

        // 5. 페이지를 나가면 감시를 중단합니다.
        return () => unsubscribe();
    }, [user?.uid]);
    // 📍 [수정된 코드] 채팅방 클릭 시 새 창으로 팝업을 띄웁니다.
    const handleItemClick = async (itemId: string) => {
        if (!user) return;

        // 1. 읽지 않은 알림(빨간 숫자)을 지워주는 기능
        const itemNotifs = notifications.filter(n => n.itemId === itemId);
        if (itemNotifs.length > 0) {
            for (const notif of itemNotifs) {
                await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { isRead: true });
            }
        }

        // 2. 🔥 [핵심] 팝업창 띄우기 로직
        const w = 450;
        const h = 650;
        const left = (window.screen.width / 2) - (w / 2);
        const top = (window.screen.height / 2) - (h / 2);

        window.open(
            `/chat/${itemId}`,
            `chat_${itemId}`, // 각 채팅방마다 고유한 이름을 주어 여러 창을 띄울 수 있게 함
            `width=${w},height=${h},left=${left},top=${top}`
        );
    };

    // 📍 정렬 로직: [1순위] 알림 있는 방 무조건 위로 -> [2순위] 알림 없으면 시간순 정렬
    const sortItems = (list: any[]) => {
        return [...list].sort((a, b) => {
            // 1. 알림(안 읽은 메시지) 유무 확인
            const aHasNotif = notifications.some((n) => n.itemId === a.id);
            const bHasNotif = notifications.some((n) => n.itemId === b.id);

            // 알림 여부가 서로 다르면, 알림 있는 방(-1)을 위로 올림
            if (aHasNotif !== bHasNotif) return aHasNotif ? -1 : 1;

            // 2. 알림 상태가 같다면 (둘 다 없거나 둘 다 있다면), 최신 시간순 정렬
            const aTime = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds * 1000 || a.createdAt?.toMillis?.() || 0;
            const bTime = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds * 1000 || b.createdAt?.toMillis?.() || 0;

            return bTime - aTime; // 내림차순 (최신순) 정렬

        });
    };

    // 🥒 [업그레이드됨] 사진을 '압축'해서 올리는 똑똑한 함수
    const handleUpdateNickname = async () => {
        const trimmed = newNickname.trim();
        if (!trimmed) return alert("닉네임을 입력해주세요! 🥒");

        try {
            setLoading(true); // ⏳ 작업 시작...
            let photoURL = user?.photoURL || "";

            // 📸 [핵심] 사진 파일이 선택되었다면?
            if (imgFile) {
                // 1. 압축 옵션 설정 (프로필 사진은 작아도 충분해요!)
                const options = {
                    maxSizeMB: 0.2,          // 최대 용량을 약 200KB로 제한
                    maxWidthOrHeight: 300,   // 가로/세로 최대 300픽셀로 제한
                    useWebWorker: true       // 웹 워커를 써서 더 빠르게!
                };

                // 2. 진짜로 압축하기
                // console.log("압축 시작..."); // (테스트용)
                const compressedFile = await imageCompression(imgFile, options);
                // console.log(`압축 완료! 원본: ${imgFile.size} -> 압축본: ${compressedFile.size}`); // (테스트용)

                // 3. 압축된 파일(compressedFile)을 창고에 업로드
                const storageRef = ref(storage, `profile_images/${user.uid}`);

                // 🔥 중요: imgFile 대신 압축된 compressedFile을 올립니다!
                await uploadBytes(storageRef, compressedFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // --- (여기 밑으로는 기존 코드와 똑같습니다) ---

            // 🏷️ 닉네임 중복 체크
            if (trimmed !== user?.displayName) {
                const q = query(collection(db, "users"), where("displayName", "==", trimmed));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setLoading(false);
                    return alert("이미 사용 중인 닉네임입니다. ❌");
                }
            }

            // 📝 프로필 정보 업데이트 (Auth + DB)
            await updateProfile(auth.currentUser!, { displayName: trimmed, photoURL: photoURL });
            await updateDoc(doc(db, "users", user.uid), { displayName: trimmed, photoURL: photoURL });

            alert("프로필 수정 완료! (사진도 가볍게 올라갔어요 ✨)");
            setIsEditing(false);
            setImgFile(null);
            setImgPreview(null);
            window.location.reload();

        } catch (error) {
            console.error("업로드 실패:", error);
            alert("사진 업로드에 실패했습니다. 😢");
        } finally {
            setLoading(false);
        }
    };

    // 📍 관리자 통계 (지표가 0으로 나오던 문제 수정)
    useEffect(() => {
        if (!isAdmin || !user) return;
        // 📍 image_031325.png의 95번 줄부터 118번 줄까지의 내용입니다.
        const fetchAdminData = async () => {
            try {
                // 1. 내 프로필 정보를 가져오는 변수
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    setPoints(userSnap.data().points || 0);
                    setRegion(userSnap.data().region || "미인증");
                }

                // 2. [수정] 전체 회원 수를 가져오는 변수 이름을 userCountSnap으로 바꿉니다.
                const userCountSnap = await getCountFromServer(collection(db, "users"));
                const itemSnap = await getCountFromServer(collection(db, "items"));
                const soldSnap = await getCountFromServer(query(collection(db, "items"), where("isSold", "==", true)));

                const totalVisitsSnap = await getDoc(doc(db, "settings", "stats"));
                const todayStr = new Date().toLocaleDateString('en-CA'); // 오늘 날짜 문자열
                const statsData = totalVisitsSnap.exists() ? totalVisitsSnap.data() : {};

                setAdminStats({
                    userCount: userCountSnap.data().count,
                    itemCount: itemSnap.data().count,
                    soldCount: soldSnap.data().count,
                    // 📍 누적 방문자 표시
                    totalVisits: statsData.totalVisitors || 0,
                    // 📍 오늘 날짜 필드(today_2026-01-26 등)에서 숫자 가져오기
                    todayVisits: statsData[`today_${todayStr}`] || 0
                });
                // ---------------------------------------------------------
            } catch (err) { console.error(err); }
        };
        fetchAdminData();
    }, [isAdmin, user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userSnap = await getDoc(doc(db, "users", currentUser.uid));
                setPoints(userSnap.exists() ? (userSnap.data().points || 0) : 0);
                // ---------------------------------------------------------
                // 📍 [방문자 카운팅] 마이페이지로 바로 접속한 경우를 위해 추가합니다.
                if (!userSnap.exists() || !userSnap.data().isVisited) {
                    // 1. 전체 통계(stats) 문서의 totalVisitors를 1 올립니다.
                    await setDoc(doc(db, "settings", "stats"), {
                        totalVisitors: increment(1)
                    }, { merge: true });

                    // 2. 이 사용자 문서에 "방문했음" 표시를 남깁니다.
                    await setDoc(doc(db, "users", currentUser.uid), {
                        isVisited: true
                    }, { merge: true });
                }
                // ---------------------------------------------------------
                // ... (위쪽 코드)
                const snapMy = await getDocs(query(collection(db, "items"), where("sellerUid", "==", currentUser.uid)));
                const snapBid = await getDocs(query(collection(db, "items"), where("lastBidderUid", "==", currentUser.uid)));

                // 🥒 [수정됨] 각 목록을 변수에 먼저 담습니다.
                const myItemsList = snapMy.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const bidItemsList = snapBid.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setMyItems(myItemsList);
                setParticipatedItems(bidItemsList);

                // 🥒 [수정됨] 판매자 목록과 입찰자 목록을 하나로 합쳐서 채팅방에 넣습니다.
                setChatRooms([...myItemsList, ...bidItemsList]);

            } else { router.push("/login"); }
            // ... (아래쪽 코드)
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleArchiveChat = async (e: any, itemId: string) => {
        e.stopPropagation();
        const isArchived = chatSettings[itemId]?.isArchived || false;
        await setDoc(doc(db, "users", user.uid, "chatSettings", itemId), { isArchived: !isArchived }, { merge: true });
    };

    const handleDeleteChat = async (e: any, itemId: string) => {
        e.stopPropagation();
        if (!confirm("삭제하시겠습니까?")) return;
        await setDoc(doc(db, "users", user.uid, "chatSettings", itemId), { isDeleted: true }, { merge: true });
    };
    // 📍 여기를 찾아서 이 코드로 완전히 바꾸세요
    const handleVerifyLocation = () => {
        setIsVerifying(true);
        if (!navigator.geolocation) {
            alert("이 기기에서는 위치 정보를 사용할 수 없습니다. 😢");
            setIsVerifying(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const naver = (window as any).naver; // 레이아웃에서 불러온 네이버 시스템을 가져옵니다

            if (!naver || !naver.maps.Service) {
                alert("네이버 지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                setIsVerifying(false);
                return;
            }

            // 📍 네이버 Geocoder로 좌표를 주소로 바꿉니다
            naver.maps.Service.reverseGeocode({
                coords: new naver.maps.LatLng(latitude, longitude),
            }, async (status: any, response: any) => {
                if (status !== naver.maps.Service.Status.OK) {
                    setIsVerifying(false);
                    return alert("주소를 찾을 수 없습니다.");
                }

                try {
                    // 네이버 주소 결과에서 '동구 화정동' 처럼 필요한 부분만 가져옵니다
                    const result = response.v2.results[0];
                    const verifiedTown = `${result.region.area2.name} ${result.region.area3.name}`;

                    // 파이어베이스의 내 정보(users)에 저장합니다
                    await updateDoc(doc(db, "users", user.uid), {
                        region: verifiedTown
                    });
                    setRegion(verifiedTown);
                    alert(`📍 ${verifiedTown} 인증 성공! ✨`);
                } catch (err) {
                    alert("정보 저장에 실패했습니다.");
                } finally {
                    setIsVerifying(false);
                }
            });
        }, () => {
            alert("위치 권한을 허용해 주세요! 🙏");
            setIsVerifying(false);
        });
    };

    const getSafeDate = (timeData: any) => (!timeData ? null : (typeof timeData.toDate === 'function' ? timeData.toDate() : new Date(timeData)));

    useEffect(() => {
        if (!user) return;
        onSnapshot(query(collection(db, "users", user.uid, "notifications"), where("isRead", "==", false)), (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        onSnapshot(collection(db, "users", user.uid, "chatSettings"), (snap) => {
            const settings: any = {};
            snap.docs.forEach(d => settings[d.id] = d.data());
            setChatSettings(settings);
        });
    }, [user]);

    if (loading) return <div style={{ padding: 50, textAlign: "center" }}>🥒 로딩 중...</div>;

    return (
        <main style={{ padding: "40px 15px", maxWidth: 800, margin: "0 auto", paddingBottom: 120 }}>
            <style jsx>{`
                /* 🥒 [수정됨] 위아래 두께(8px)를 줄이고 카드 사이 간격(15px)을 좁혔습니다. */
.section-card { 
    background: white; 
    padding: 8px 15px; 
    border-radius: 16px; 
    box-shadow: 0 10px 30px rgba(45,90,39,0.05); 
    border: 1px solid #E8E3D8; 
    margin-bottom: 15px; 
}
                .list-item { display: flex; align-items: center; gap: 15px; padding: 16px; background: ${warmBeige}; border-radius: 18px; margin-bottom: 12px; cursor: pointer; border: 1px solid transparent; }
                .list-item:hover { transform: translateX(5px); border-color: ${mainGreen}; }
                .dropdown-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
                .dropdown-header h2 { font-size: 18px; font-weight: 800; color: #1A3A17; margin: 0; }
            `}</style>

            {/* 🥒 [수정됨] 유저 정보 카드 맨 윗줄: 닉네임 + 수정 + 나가기 버튼 일렬 배치 */}
            <div className="section-card" style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>

                    <div style={{ flex: 1 }}>
                        {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {/* 🥒 사진 선택 영역 */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#F0F4F8", overflow: "hidden", border: "1px solid #E2E8F0", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        {imgPreview ? <img src={imgPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📸"}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setImgFile(file);
                                                setImgPreview(URL.createObjectURL(file)); // 미리보기 생성
                                            }
                                        }}
                                        style={{ fontSize: "12px", flex: 1 }}
                                    />
                                </div>
                                {/* 닉네임 입력 영역 */}
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #E0D7C6", flex: 1, outline: "none" }} />
                                    <button onClick={handleUpdateNickname} style={{ padding: "10px 20px", background: mainGreen, color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>저장</button>
                                </div>
                            </div>
                        ) : (
                            // ... (이하 생략)
                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                {/* 🥒 이름 대신 깔끔한 기본 이미지를 사용하는 최종 코드입니다. */}
                                <div
                                    onClick={() => { if (user?.photoURL) setIsPreviewOpen(true); }}
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "50%",
                                        background: "#F7FAFC",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        border: "1px solid #E2E8F0",
                                        overflow: "hidden",
                                        cursor: user?.photoURL ? "pointer" : "default"
                                    }}
                                >
                                    {user?.photoURL ? (
                                        /* 1. 사용자가 직접 올린 사진이 있을 때 */
                                        <img src={user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        /* 2. 사진이 없을 때 (이름 대신 깔끔한 회색 사람 아이콘) */
                                        <img
                                            src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                                            alt="기본프로필"
                                            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
                                        />
                                    )}
                                </div>

                                {/* 닉네임 영역 (기존에 사용자님이 만드신 코드와 똑같습니다) */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                                        <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#1A3A17", margin: 0 }}>
                                            {user?.displayName || "닉네임 없음"}님
                                        </h1>
                                        <button
                                            onClick={() => { setNewNickname(user?.displayName || ""); setIsEditing(true); }}
                                            style={{ background: "#F5F0E8", border: "none", padding: "4px 8px", borderRadius: "8px", color: mainGreen, fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                                        >
                                            수정
                                        </button>
                                    </div>
                                    <div style={{ color: "#718096", fontSize: "13px", marginTop: "2px" }}>{user?.email}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 나가기 버튼 배치 */}
                    <button
                        onClick={() => router.push("/list")}
                        style={{
                            background: "white",
                            border: "1px solid #E2E8F0",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: "#4A5568",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            marginLeft: "10px"
                        }}
                    >
                        나가기 ⬅️
                    </button>
                </div>

                {/* 이 아래는 기존에 있던 동네 인증, 포인트 상자가 그대로 이어집니다 */}




                {/* 🥒 [수정됨] 제목과 주소를 옆으로 나란히 배치했습니다. */}
                <div style={{ marginBottom: "15px", padding: "10px 15px", background: "#F0F4F8", borderRadius: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ fontSize: 15, color: "#4A5568", fontWeight: "bold" }}>인증된 내 동네</div>
                        <div style={{ fontSize: "14px", color: "#2D3748", fontWeight: "800" }}>📍 {region}</div>
                    </div>
                    <button onClick={handleVerifyLocation} disabled={isVerifying} style={{ padding: "6px 12px", background: mainGreen, color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", opacity: isVerifying ? 0.7 : 1 }}>
                        {isVerifying ? "확인 중..." : "동네인증"}
                    </button>
                </div>
                {/* 🥒 [수정됨] 포인트 상자의 두께를 줄이고 글자/버튼을 날씬하게 만들었습니다. */}
                <div style={{ padding: "10px 15px", background: warmBeige, borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 11, color: mainGreen, fontWeight: "bold" }}>내 포인트</div>
                        <div style={{ fontSize: "18px", color: mainGreen, fontWeight: "900" }}>{points.toLocaleString()} P</div>
                    </div>
                    <button
                        onClick={() => alert("준비 중!")}
                        style={{ padding: "6px 12px", background: mainGreen, color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
                    >
                        충전하기
                    </button>
                </div>
            </div>



            {/* 관리자 대시보드 */}
            {isAdmin && (
                <div style={{ background: "#1A202C", color: "white", padding: "12px 15px", borderRadius: "16px", marginBottom: "15px" }}>
                    <div style={{ fontSize: "11px", color: "#A0AEC0", marginBottom: "8px", fontWeight: "bold" }}>📊 서비스 통합 지표</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                        <StatItem label="회원 수" value={`${adminStats.userCount}명`} />
                        <StatItem label="등록 상품" value={`${adminStats.itemCount}개`} />
                        <StatItem label="총 거래" value={`${adminStats.soldCount}건`} />
                        <StatItem label="오늘 방문" value={`${adminStats.todayVisits}회`} />
                    </div>
                </div>
            )}
            {/* 📍 여기까지 추가하시면 됩니다 */}

            <div className="section-card" style={{ border: `2px solid ${mainGreen}` }}>
                <div className="dropdown-header" onClick={() => setIsBidNotifOpen(!isBidNotifOpen)}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        🔨 새로운 입찰 소식
                        {notifications.filter(n => n.type === "bid").length > 0 && (
                            <span style={{ backgroundColor: "#FF4D4F", color: "white", fontSize: "11px", padding: "2px 8px", borderRadius: "10px" }}>
                                {notifications.filter(n => n.type === "bid").length}
                            </span>
                        )}
                        {isBidNotifOpen ? " ▲" : " ▼"}
                    </h2>
                </div>

                {isBidNotifOpen && (
                    <div style={{ marginTop: "20px" }}>
                        {notifications.filter(n => n.type === "bid").length > 0 ? (
                            notifications.filter(n => n.type === "bid").map((notif) => (
                                <div key={notif.id} onClick={() => handleItemClick(notif.itemId)} className="list-item" style={{ background: "#FFFBEB" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: "800", color: "#1A3A17" }}>{notif.title}</div>
                                        <div style={{ fontSize: 13, color: "#4A5568", marginTop: "4px" }}>{notif.text}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "20px", color: "#A0AEC0", fontSize: "14px" }}>새로운 입찰 소식이 없습니다. 🥒</div>
                        )}
                    </div>
                )}
            </div>


            {/* 💬 나의 채팅 내역 드롭다운 섹션 */}
            <div className="section-card">
                <div className="dropdown-header" onClick={() => setIsChatOpen(!isChatOpen)}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        💬 {viewMode === "active" ? "나의 채팅 내역" : "📦 보관함"}

                        {/* ✅ 1. 조건문: '현재 화면에 보이는 알림'이 있을 때만 표시 */}
                        {notifications.filter(n => {
                            const isArchived = chatSettings[n.itemId]?.isArchived || false;
                            const isDeleted = chatSettings[n.itemId]?.isDeleted || false;
                            if (isDeleted) return false;
                            return viewMode === "active" ? !isArchived : isArchived;
                        }).length > 0 && (
                                <span style={{
                                    backgroundColor: "#FF4D4F",
                                    color: "white",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    marginLeft: "5px",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                }}>
                                    {/* ✅ 2. 표시 내용: '현재 화면에 보이는 채팅방'의 알림만 계산해서 표시 */}
                                    {notifications.filter(n => {
                                        const isArchived = chatSettings[n.itemId]?.isArchived || false;
                                        const isDeleted = chatSettings[n.itemId]?.isDeleted || false;
                                        if (isDeleted) return false;
                                        return viewMode === "active" ? !isArchived : isArchived;
                                    }).length}
                                </span>
                            )}

                        {isChatOpen ? " ▲" : " ▼"}
                    </h2>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setViewMode(viewMode === "active" ? "archived" : "active");
                        }}
                        style={{
                            background: "none", border: `1px solid ${mainGreen}`,
                            color: mainGreen, padding: "4px 12px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: "bold"
                        }}
                    >
                        {viewMode === "active" ? "보관함" : "돌아가기"}
                    </button>
                </div>

                {/* 실제 채팅방 목록 영역 */}
                {isChatOpen && (
                    <div style={{ marginTop: "20px" }}>
                        {chatRooms.length > 0 ? sortItems(chatRooms)
                            .filter(room => !chatSettings[room.id]?.isDeleted)
                            .filter(room => viewMode === "active" ? !chatSettings[room.id]?.isArchived : chatSettings[room.id]?.isArchived)
                            .map(room => {
                                const otherParty = room.sellerUid === user.uid ? (room.lastBidderNickname || "입찰자") : (room.sellerNickname || "판매자");
                                const roomUnreadCount = notifications.filter(n => n.itemId === room.id).length;
                                const timeObj = room.lastMessageAt || room.createdAt;
                                let lastTime = "시간 정보 없음";

                                if (timeObj) {
                                    const dateValue = typeof timeObj.toDate === 'function' ? timeObj.toDate() : new Date(timeObj);
                                    lastTime = dateValue.toLocaleString('ko-KR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', hour12: false
                                    });
                                }

                                return (
                                    <div key={room.id} onClick={() => handleItemClick(room.id)} className="list-item">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div style={{ fontSize: 15, fontWeight: "800", color: "#1A3A17" }}>{room.title}</div>
                                                {roomUnreadCount > 0 && (
                                                    <span style={{
                                                        background: "#E53E3E", color: "white", padding: "2px 8px",
                                                        borderRadius: "10px", fontSize: "11px", fontWeight: "bold"
                                                    }}>
                                                        {roomUnreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, color: mainGreen, marginTop: "4px" }}>
                                                {otherParty}님과 대화
                                            </div>
                                            <div style={{ color: "#A0AEC0", fontSize: "12px", marginTop: "2px" }}>
                                                {lastTime}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", marginLeft: "10px" }}>
                                            <button onClick={(e) => handleArchiveChat(e, room.id)} style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "11px", border: "1px solid #ddd" }}>보관</button>
                                            <button onClick={(e) => handleDeleteChat(e, room.id)} style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "11px", border: "1px solid #FEB2B2", color: "#E53E3E" }}>삭제</button>
                                        </div>
                                    </div>
                                );
                            }) : <div style={{ textAlign: "center", padding: "20px", color: "#A0AEC0" }}>내역이 없습니다.</div>}
                    </div>
                )}
            </div>

            {/* 📦 물건 리스트 드롭다운 섹션 (전부 닫힘) */}
            <div className="section-card">
                {/* 등록한 물건 */}
                <div className="dropdown-header" onClick={() => setIsMyItemsOpen(!isMyItemsOpen)}>
                    <h2>📦 내가 등록한 물건 ({myItems.length}) {isMyItemsOpen ? "▲" : "▼"}</h2>
                </div>
                {/* 📍 내가 등록한 물건 리스트 (날짜 추가 버전) */}
                {isMyItemsOpen && (
                    <div style={{ marginTop: "20px" }}>
                        {myItems.map(item => {
                            // ✅ 등록 날짜 계산 (시간 제외, 년월일만)
                            const regDate = getSafeDate(item.createdAt)?.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            }) || "날짜 정보 없음";

                            return (
                                <div key={item.id} onClick={() => router.push(`/item/${item.id}`)} className="list-item">
                                    {item.images?.[0] && (
                                        <img src={item.images[0]} style={{ width: 45, height: 45, borderRadius: "12px", objectFit: "cover" }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333" }}>{item.title}</div>
                                        {/* 📍 여기에 년월일 날짜가 표시됩니다 */}
                                        <div style={{ fontSize: "12px", color: "#A0AEC0", marginTop: "4px" }}>{regDate}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 입찰 중인 물건 */}
                <div className="dropdown-header" style={{ marginTop: '25px' }} onClick={() => setIsBiddingOpen(!isBiddingOpen)}>
                    <h2>🔥 입찰 중인 물건 {isBiddingOpen ? "▲" : "▼"}</h2>
                </div>
                {isBiddingOpen && (
                    <div style={{ marginTop: "15px" }}>
                        {participatedItems.filter(item => getSafeDate(item.endTime)! > new Date() && !item.isSold).map(item => (
                            <MiniItem key={item.id} item={item} onClick={() => router.push(`/item/${item.id}`)} accent />
                        ))}
                    </div>
                )}

                {/* 낙찰 성공! */}
                <div className="dropdown-header" style={{ marginTop: '25px' }} onClick={() => setIsWonOpen(!isWonOpen)}>
                    <h2>🎊 낙찰 성공! {isWonOpen ? "▲" : "▼"}</h2>
                </div>
                {isWonOpen && (
                    <div style={{ marginTop: "15px" }}>
                        {participatedItems.filter(item => getSafeDate(item.endTime)! <= new Date() || item.isSold).map(item => (
                            <MiniItem key={item.id} item={item} onClick={() => router.push(`/item/${item.id}`)} success />
                        ))}
                    </div>
                )}
            </div>




            {/* 🥒 [추가] 사진 크게 보기 모달창 (검은 배경) */}
            {isPreviewOpen && (
                <div
                    onClick={() => setIsPreviewOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.9)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2000,
                        cursor: "zoom-out",
                        padding: "20px"
                    }}
                >
                    <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
                        <img
                            src={user?.photoURL || ""}
                            alt="프로필 크게보기"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "80vh",
                                borderRadius: "12px",
                                objectFit: "contain",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.8)"
                            }}
                        />
                    </div>

                    <div style={{ color: "white", marginTop: "25px", fontWeight: "bold", fontSize: "16px", textShadow: "0 2px 10px rgba(0,0,0,1)" }}>
                        화면을 아무 데나 누르면 닫힙니다 ✖️
                    </div>
                </div>
            )}

            <BottomNav />
        </main>
    );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#A0AEC0", marginBottom: "5px" }}>{label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "white" }}>{value}</div>
        </div>
    );
}

function MiniItem({ item, onClick, accent, success }: any) {
    // ✅ 날짜 변환 로직 (년. 월. 일.)
    const timeData = item.endTime || item.createdAt;
    const dateStr = timeData
        ? (typeof timeData.toDate === 'function' ? timeData.toDate() : new Date(timeData))
            .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : "";

    return (
        <div onClick={onClick} style={{
            display: "flex", gap: "12px", padding: "12px", borderRadius: "16px", marginBottom: "8px", cursor: "pointer",
            background: success ? "#F0FFF4" : "#FDFBF7", border: accent ? "1px solid #3CB371" : "1px solid transparent"
        }}>
            {item.images?.[0] && <img src={item.images[0]} style={{ width: 45, height: 45, borderRadius: "12px", objectFit: "cover" }} />}

            <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: success ? "#2D5A27" : "#333", display: "flex", alignItems: "center" }}>
                    {success && "✅ "} {item.title}
                </div>
                {/* 📍 낙찰 성공 날짜 표시 */}
                <div style={{ fontSize: "12px", color: "#A0AEC0", marginTop: "4px" }}>
                    {dateStr}
                </div>
            </div>
        </div>
    );
}                                                                                                   