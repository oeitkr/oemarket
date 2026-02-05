"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <main
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: "1.75",
        color: "#333",
        backgroundColor: "#fff",
      }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => router.back()}
        style={{
          border: "none",
          background: "none",
          color: "#3182ce",
          cursor: "pointer",
          marginBottom: "20px",
          fontSize: "16px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        ← 뒤로가기
      </button>

      <h1 style={{ fontSize: "26px", fontWeight: "bold", marginBottom: "6px" }}>
        개인정보 처리방침 📄
      </h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "22px" }}>
        최종본 / 시행일자: [YYYY.MM.DD]
      </p>

      <div
        style={{
          border: "1px solid #eee",
          padding: "26px",
          borderRadius: "16px",
          backgroundColor: "#fdfdfd",
        }}
      >
        {/* 기본 정보 */}
        <section style={sectionBoxStyle}>
          <p style={{ marginTop: 0 }}>
            <strong>[상호/개인사업자명]</strong>(이하 “회사”)는 「개인정보 보호법」 등 관련
            법령을 준수하며, 이용자의 개인정보를 적법하고 안전하게 처리하기 위하여 다음과
            같이 개인정보처리방침을 수립·공개합니다.
          </p>

          <div style={infoBoxStyle}>
            • 서비스명: [서비스명] <br />
            • 시행일자: [YYYY.MM.DD] <br />
            • 개인정보처리자: [상호], 대표자 [성명] <br />
            • 사업자등록번호: [번호] (해당 시) <br />
            • 주소: [주소] (해당 시) <br />
            • 문의: [이메일] / [전화] <br />
            • 개인정보 보호책임자: [성명/직책], 연락처 [이메일/전화]
          </div>
        </section>

        {/* 1. 처리 목적 */}
        <Section title="1. 개인정보의 처리 목적">
          <p>
            회사는 다음 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 아래 목적
            이외의 용도로는 이용되지 않으며, 목적이 변경되는 경우 관련 법령에 따라 별도
            동의 또는 안내를 진행합니다.
          </p>
          <ul style={listStyle}>
            <li>회원가입 및 본인 확인, 계정 관리, 부정 이용 방지</li>
            <li>경매·역경매 및 거래 중개 기능 제공(상품 등록, 참여/낙찰 처리, 알림 제공)</li>
            <li>채팅 기능 제공 및 고객지원(문의 대응, 분쟁 대응)</li>
            <li>서비스 품질 개선 및 보안(접속기록 관리, 오류 분석, 비정상 이용 탐지)</li>
            <li>(선택) 마케팅/프로모션 정보 제공(수신 동의자에 한함)</li>
          </ul>
        </Section>

        {/* 2. 항목 및 방법 */}
        <Section title="2. 처리하는 개인정보의 항목 및 수집 방법">
          <p style={{ marginBottom: "12px" }}>
            회사는 서비스 제공에 필요한 최소한의 개인정보만 처리합니다.
          </p>

          <div style={miniBlockStyle}>
            <strong>2-1) 회원가입/본인확인 (필수)</strong>
            <ul style={ulStyle}>
              <li>휴대폰 번호, 인증값/인증결과(토큰 등)</li>
              <li>닉네임, 내부 회원 식별자(ID)</li>
              <li>(선택) 프로필 이미지, 소개글</li>
            </ul>

            <strong>2-2) 서비스 이용 과정에서 생성·수집되는 정보 (필수)</strong>
            <ul style={ulStyle}>
              <li>상품 등록 정보(제목, 설명, 사진, 카테고리, 거래 방식/조건 등)</li>
              <li>경매/역경매 참여·낙찰 기록(참여 시각, 금액/조건, 마감 결과, 상태 로그)</li>
              <li>채팅 메시지/첨부(이미지 등) 및 전송 기록</li>
              <li>신고/차단/문의 기록(사유, 처리 결과 등)</li>
            </ul>

            <strong>2-3) 자동 수집 정보 (필수)</strong>
            <ul style={ulStyle}>
              <li>접속 로그, IP, 쿠키/세션(웹)</li>
              <li>기기·브라우저/앱 정보(OS, 버전, 기기 모델, 언어, 접속 환경)</li>
              <li>오류/진단 정보(서비스 안정화 목적)</li>
            </ul>

            <strong>2-4) 선택 항목 (해당 시)</strong>
            <ul style={ulStyle}>
              <li>마케팅 수신 동의 정보(수신 여부, 채널별 동의 내역, 발송 이력)</li>
            </ul>
          </div>

          <div style={calloutBlueStyle}>
            <strong>비공개 원칙</strong>
            <p style={{ margin: "8px 0 0" }}>
              회사는 회원의 전화번호/실명/주소 등 개인정보를 거래 상대방(판매자·낙찰자 포함)에게
              제공하지 않습니다. 거래는 닉네임 및 내부식별자 기반 채팅으로 진행됩니다.
            </p>
          </div>
        </Section>

        {/* 3. 보유 기간 */}
        <Section title="3. 개인정보의 처리 및 보유 기간">
          <p>
            회사는 개인정보를 처리 목적 달성 시까지 보유·이용하며, 목적 달성 또는 회원 탈퇴 시
            지체 없이 파기합니다. 다만 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <ul style={listStyle}>
            <li>회원정보(휴대폰 번호, 닉네임, 내부ID 등): 회원 탈퇴 시까지</li>
            <li>거래/경매/역경매 기록, 채팅 기록: [예: 탈퇴 후 6개월] 보관 후 파기</li>
            <li>부정 이용 방지 기록(제재/차단 이력 등): [예: 탈퇴 후 1년] 보관 후 파기</li>
            <li>관계 법령에 따른 보관(해당 시): 전자상거래 관련 법령 등에서 요구하는 범위 내 보관</li>
          </ul>
        </Section>

        {/* 4. 제3자 제공 */}
        <Section title="4. 개인정보의 제3자 제공">
          <p>
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 아래의 경우에는 예외로 합니다.
          </p>
          <ul style={listStyle}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 근거가 있거나 수사기관 등 관계기관의 적법한 절차에 따른 요청이 있는 경우</li>
          </ul>
          <div style={calloutRedStyle}>
            <strong>중요</strong>
            <p style={{ margin: "8px 0 0" }}>
              회사는 거래 편의를 이유로도 판매자와 낙찰자(구매자)에게 서로의 전화번호 등 개인정보를 제공하지 않습니다.
            </p>
          </div>
        </Section>

        {/* 5. 위탁 */}
        <Section title="5. 개인정보 처리의 위탁">
          <p>
            회사는 원활한 서비스 제공을 위해 개인정보 처리 업무의 일부를 외부에 위탁할 수 있으며,
            위탁 시 관련 법령에 따라 수탁자를 관리·감독합니다.
          </p>
          <div style={infoBoxStyle}>
            • 위탁업무 내용: [예: 클라우드 서버/DB 호스팅, 문자·이메일 발송, 고객상담, 오류 분석 도구] <br />
            • 수탁자: [업체명 기재] <br />
            • 보유 및 이용기간: 위탁 계약 종료 시 또는 위탁 목적 달성 시까지
          </div>
          <p style={{ marginTop: "12px" }}>
            (실제 사용 업체가 확정되면 “업체명/업무/이전항목/보유기간” 형태로 구체화하는 것을 권장합니다.)
          </p>
        </Section>

        {/* 6. 국외 이전 */}
        <Section title="6. 국외 이전 (해당 시)">
          <p>
            회사가 해외 사업자(예: 클라우드/분석/푸시 서비스)를 이용하는 경우 개인정보가 국외로 이전될 수 있습니다.
            국외 이전이 발생하는 경우 회사는 관련 법령에 따라 이전 국가, 이전 항목, 이전 목적, 보유기간 등을 안내하고
            필요한 조치를 이행합니다.
          </p>
          <div style={infoBoxStyle}>
            • 이전 받는 자: [업체명] <br />
            • 이전 국가: [국가] <br />
            • 이전 항목: [이전되는 개인정보 항목] <br />
            • 이전 목적: [서비스 제공/분석/알림 등] <br />
            • 이전 시점/방법: [예: 서비스 이용 시 네트워크를 통한 전송] <br />
            • 보유 및 이용기간: [목적 달성 또는 계약 종료 시까지]
          </div>
        </Section>

        {/* 7. 권리 */}
        <Section title="7. 이용자의 권리 및 행사 방법">
          <p>
            이용자는 언제든지 자신의 개인정보에 대하여 열람, 정정, 삭제, 처리정지, 동의 철회를 요구할 수 있습니다.
            회사는 관련 법령에 따라 지체 없이 조치합니다.
          </p>
          <div style={miniBlockStyle}>
            <strong>행사 방법</strong>
            <ul style={ulStyle}>
              <li>서비스 내 설정 메뉴 또는 고객센터([이메일])로 요청</li>
              <li>본인 확인 후 요청 사항 처리 및 결과 안내</li>
            </ul>
          </div>
        </Section>

        {/* 8. 채팅 유의 */}
        <Section title="8. 채팅 이용 시 유의사항(개인정보 보호 안내)">
          <p>
            회사는 거래 상대방에게 회원의 개인정보를 제공하지 않으며, 채팅은 닉네임/내부식별자 기반으로 운영됩니다.
          </p>
          <p>
            다만 이용자가 채팅에서 자발적으로 전화번호, 계좌번호, 주소 등 개인정보를 공유할 수 있으므로,
            이용자는 개인정보 노출에 유의해야 합니다. 회사는 안전한 거래 환경을 위해 경고, 제한, 신고 처리 등 운영 조치를 할 수 있습니다.
          </p>
        </Section>

        {/* 9. 파기 */}
        <Section title="9. 개인정보의 파기 절차 및 방법">
          <p>회사는 개인정보 보유기간의 경과 또는 처리 목적 달성 시 지체 없이 파기합니다.</p>
          <ul style={listStyle}>
            <li>파기 절차: 파기 사유 발생 → 내부 절차에 따라 대상 선정 → 파기</li>
            <li>전자적 파일: 복구 불가능한 방식으로 영구 삭제</li>
            <li>출력물: 분쇄 또는 소각</li>
          </ul>
        </Section>

        {/* 10. 안전조치 */}
        <Section title="10. 개인정보의 안전성 확보조치">
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 수행합니다.</p>
          <ul style={listStyle}>
            <li>관리적 조치: 내부 관리계획 수립, 접근 권한 최소화, 교육 및 점검</li>
            <li>기술적 조치: 전송구간 암호화(SSL/TLS), 접근통제, 로그 모니터링, 계정 보호</li>
            <li>물리적 조치: 개인정보 처리 시스템 접근 통제</li>
          </ul>
        </Section>

        {/* 11. 위치정보 */}
        <Section title="11. 위치정보에 관한 사항(해당 시)">
          <p>
            회사가 “내 주변” 등 위치 기반 기능을 제공하는 경우, 별도의 위치기반서비스 이용약관 및 동의에 따라 개인위치정보를 처리할 수 있습니다.
          </p>
          <p style={{ marginBottom: 0 }}>
            현재 위치기반 기능을 제공하는 경우/제공 예정인 경우, 관련 법령에 따른 고지 및 이용자 권리(동의 철회, 열람 등)를 보장합니다.
          </p>
        </Section>

        {/* 12. 책임자 */}
        <Section title="12. 개인정보 보호책임자 및 고충 처리">
          <div style={infoBoxStyle}>
            • 개인정보 보호책임자: [성명/직책] <br />
            • 연락처: [이메일] / [전화]
          </div>
          <p style={{ marginTop: "12px", marginBottom: 0 }}>
            회사는 이용자의 문의 및 고충을 신속하고 성실하게 처리합니다.
          </p>
        </Section>

        {/* 13. 변경 */}
        <Section title="13. 개인정보처리방침의 변경">
          <p style={{ marginBottom: 0 }}>
            본 방침은 법령, 서비스 정책 또는 보안 기술 변경 등에 따라 수정될 수 있으며,
            변경 시 서비스 내 공지 또는 별도 안내를 통해 고지합니다.
          </p>
        </Section>

        <p
          style={{
            textAlign: "center",
            color: "#999",
            fontSize: "12px",
            marginTop: "26px",
            marginBottom: 0,
          }}
        >
          본 개인정보처리방침은 [YYYY.MM.DD]부터 적용됩니다.
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionBoxStyle}>
      <h3 style={subTitleStyle}>{title}</h3>
      {children}
    </section>
  );
}

// 스타일 모음
const sectionBoxStyle: React.CSSProperties = {
  marginBottom: "28px",
  paddingBottom: "16px",
  borderBottom: "1px solid #f0f0f0",
};

const subTitleStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: "bold",
  marginBottom: "12px",
  color: "#2d3748",
};

const infoBoxStyle: React.CSSProperties = {
  background: "#f8fafc",
  padding: "15px",
  borderRadius: "10px",
  fontSize: "13px",
  color: "#4a5568",
  marginTop: "10px",
  lineHeight: "1.8",
  border: "1px solid #edf2f7",
};

const listStyle: React.CSSProperties = {
  paddingLeft: "20px",
  marginTop: "8px",
  marginBottom: 0,
};

const ulStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  paddingLeft: "18px",
};

const miniBlockStyle: React.CSSProperties = {
  marginTop: "10px",
  padding: "12px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #edf2f7",
  fontSize: "13px",
  color: "#4a5568",
};

const calloutBlueStyle: React.CSSProperties = {
  marginTop: "12px",
  padding: "14px",
  borderRadius: "12px",
  background: "#f0f9ff",
  border: "1px solid #bee3f8",
  fontSize: "13px",
  color: "#2c5282",
};

const calloutRedStyle: React.CSSProperties = {
  marginTop: "12px",
  padding: "14px",
  borderRadius: "12px",
  background: "#fff5f5",
  border: "1px solid #fed7d7",
  fontSize: "13px",
  color: "#742a2a",
};
