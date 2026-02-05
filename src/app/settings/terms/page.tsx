"use client";

import { useRouter } from "next/navigation";

export default function TermsOfServicePage() {
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
      {/* 상단 네비게이션 */}
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
        }}
      >
        ← 뒤로가기
      </button>

      <h1 style={{ fontSize: "26px", fontWeight: "bold", marginBottom: "6px" }}>
        이용약관 ⚖️
      </h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "22px" }}>
        시행일자: [YYYY.MM.DD]
      </p>

      <div
        style={{
          border: "1px solid #eee",
          padding: "26px",
          borderRadius: "16px",
          backgroundColor: "#fdfdfd",
        }}
      >
        {/* 운영자 정보 박스 */}
        <div
          style={{
            background: "#f1f5f9",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "13px",
            marginBottom: "26px",
          }}
        >
          <strong>운영 정보</strong>
          <br />
          • 서비스명: [서비스명]
          <br />
          • 상호: [상호]
          <br />
          • 대표자: [성명]
          <br />
          • 사업자등록번호: [번호] (해당 시)
          <br />
          • 고객센터: [이메일/전화] (운영시간: [시간])
        </div>

        <Section title="제1조 (목적)">
          <p>
            본 약관은 [상호](이하 “회사”)가 제공하는 [서비스명](이하 “서비스”)의 이용과
            관련하여 회사와 회원 간의 권리·의무 및 책임사항, 이용조건 및 절차 등을
            규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <ol style={olStyle}>
            <li>
              “서비스”란 회사가 제공하는 웹/앱 기반의 경매·역경매 및 거래 중개, 채팅,
              알림, 후기, 신고/제재 등 제반 기능을 말합니다.
            </li>
            <li>“회원”이란 본 약관에 동의하고 가입하여 서비스를 이용하는 자를 말합니다.</li>
            <li>“판매자”란 물품을 등록하여 경매 또는 역경매를 진행하는 회원을 말합니다.</li>
            <li>
              “참여자”란 경매/역경매에 참여(입찰/참여행위 포함)하는 회원을 말합니다.
            </li>
            <li>“낙찰자”란 경매 종료 시 낙찰된 회원을 말합니다.</li>
            <li>
              “콘텐츠”란 상품 정보, 사진, 글, 채팅, 후기 등 회원이 서비스에 게시·전송하는
              모든 정보를 말합니다.
            </li>
            <li>
              “내부식별자”란 서비스 내에서 회원을 구분하기 위해 회사가 부여하는 번호/토큰
              등 식별값을 말합니다.
            </li>
            <li>
              “운영정책”이란 서비스 운영, 경매/역경매 세부 규칙, 금지품목, 제재 기준 등을
              정한 별도 기준(공지/고객센터/정책 페이지 포함)을 말하며, 본 약관의 일부로
              봅니다.
            </li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 게시 및 개정)">
          <ol style={olStyle}>
            <li>회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 화면에 게시합니다.</li>
            <li>
              회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시
              적용일자 및 개정사유를 명시하여 사전 공지합니다.
            </li>
            <li>
              회원이 개정 약관에 동의하지 않을 경우 회원은 이용계약을 해지할 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제4조 (이용계약의 성립 및 가입 제한)">
          <ol style={olStyle}>
            <li>이용계약은 가입 신청자가 약관에 동의하고 회사가 승낙함으로써 성립합니다.</li>
            <li>
              회사는 다음 각 호에 해당하는 신청에 대하여 승낙을 거절하거나 사후에 이용계약을
              해지할 수 있습니다.
              <ul style={ulStyle}>
                <li>타인의 정보 도용 또는 허위 정보 기재</li>
                <li>부정 이용 목적이 명백하거나 서비스 운영을 방해하는 경우</li>
                <li>법령 또는 약관/운영정책 위반 이력이 중대한 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제5조 (회원정보의 관리)">
          <ol style={olStyle}>
            <li>회원은 계정 정보를 최신으로 유지해야 하며, 계정 관리 책임은 회원에게 있습니다.</li>
            <li>회원은 계정의 부정 사용을 인지한 경우 즉시 회사에 통지해야 합니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (서비스의 제공 및 변경)">
          <ol style={olStyle}>
            <li>
              회사는 회원에게 다음 서비스를 제공합니다.
              <ul style={ulStyle}>
                <li>상품 등록/조회, 경매·역경매 진행 및 참여 기능</li>
                <li>채팅/알림, 찜/후기, 신고/차단 등 부가 기능</li>
              </ul>
            </li>
            <li>
              회사는 운영상·기술상 필요에 따라 서비스 내용의 일부 또는 전부를 변경할 수 있으며,
              변경 시 서비스 내 공지 등으로 안내할 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제7조 (서비스 이용제한 및 중단, 긴급조치 권한) ⛔">
          <ol style={olStyle}>
            <li>
              회사는 점검, 시스템 장애, 통신망 장애, 천재지변 등 불가피한 사유가 있는 경우
              서비스 제공을 일시 중단할 수 있습니다.
            </li>
            <li>
              회사는 약관/운영정책 위반 또는 그 우려가 있다고 합리적으로 판단되는 경우, 사전 통지 없이
              게시물 삭제/노출 제한, 경매·역경매의 중지 또는 무효 처리, 거래 제한, 기능 제한,
              계정 정지/영구이용정지 등 필요한 조치를 할 수 있습니다.
              <div style={calloutStyle}>
                <strong>예시 사유</strong>: 금지품목 등록, 사기/허위매물, 가격조작/담합/자동화 도구 이용,
                보안 위협(취약점 악용·크롤링·비정상 접근), 법령 준수 또는 이용자 보호 필요 등
              </div>
            </li>
          </ol>
        </Section>

        {/* 핵심 강조 */}
        <section
          style={{
            ...sectionStyle,
            border: "1px solid #ebf8ff",
            padding: "16px",
            borderRadius: "12px",
            backgroundColor: "#f0f9ff",
          }}
        >
          <h3 style={{ ...titleStyle, color: "#2b6cb0" }}>
            제8조 (거래 당사자 정보 비공개 원칙) ⭐
          </h3>
          <p>
            회사는 거래 안전을 위해 회원의 <strong>전화번호·주소·실명 등 개인정보를 거래 상대방(판매자/낙찰자 포함)에게 제공하지 않습니다.</strong>
          </p>
          <p>
            모든 거래는 <strong>닉네임 및 내부식별자 기반의 채팅 기능</strong>을 통해 진행됩니다.
          </p>
          <p>
            회원은 채팅에서 개인정보를 자발적으로 공유할 수 있으나, 그로 인해 발생할 수 있는 위험을 충분히
            인지하고 스스로 주의해야 합니다. 회사는 안전한 거래 환경을 위해 경고, 제한, 신고 처리 등 운영 조치를
            취할 수 있습니다.
          </p>
        </section>

        <Section title="제9조 (회사의 역할: 중개자로서의 지위)">
          <ol style={olStyle}>
            <li>회사는 회원 간 거래를 위한 온라인 플랫폼을 제공하며, 원칙적으로 거래의 당사자가 아닙니다.</li>
            <li>회사는 이용자 보호 및 법령 준수를 위해 필요한 고지·정보제공 및 운영 조치를 수행합니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (경매·역경매 공통 원칙)">
          <ol style={olStyle}>
            <li>경매·역경매의 기준 시간은 회사 서버 시간이 우선합니다.</li>
            <li>
              회사는 부정 참여, 시스템 악용, 오류 이용 등 공정성을 해치는 행위를 금지하며, 필요한 경우 해당
              경매·역경매를 중지/무효 처리할 수 있습니다.
            </li>
            <li>
              판매자는 상품 정보(상태/하자/구성품/거래 조건)를 사실에 근거하여 성실히 기재해야 합니다.
            </li>
            <li>
              경매·역경매의 진행, 마감, 낙찰/무효 여부 판단에 관하여 서비스에 기록된 <strong>서버 시간 및 로그</strong>가
              원칙적으로 우선합니다(네트워크 지연 등으로 표시가 달라질 수 있음).
            </li>
          </ol>
        </Section>

        <Section title="제11조 (일반 경매 규칙)">
          <ol style={olStyle}>
            <li>
              판매자는 등록 시 마감 시간, 최소 참여 단위, 즉시구매가(선택) 등을 설정할 수 있습니다.
            </li>
            <li>참여자는 공지된 최소 단위 및 규칙에 따라 참여합니다.</li>
            <li>
              마감 시점 최고 조건(가격 등)을 충족한 참여자가 낙찰자가 되며, 즉시구매가가 설정된 경우
              즉시구매 선택 시 해당 경매는 즉시 종료될 수 있습니다.
            </li>
            <li>참여 취소 가능 여부 및 패널티, 무효 처리 기준은 운영정책 및 서비스 화면 고지에 따릅니다.</li>
          </ol>
        </Section>

        <Section title="제12조 (역경매 규칙) 🔥">
          <ol style={olStyle}>
            <li>
              역경매는 가격이 하향(또는 조건이 변동)되는 방식으로 진행되며, 구체적인 진행 방식은 상품 상세에
              표시된 규칙을 따릅니다.
            </li>
            <li>
              차트/가격 흐름 시각화는 이해를 돕기 위한 정보이며, <strong>최종 조건은 서비스가 표시하는 현재 조건 및 마감 결과</strong>를 기준으로 합니다.
            </li>
            <li>
              회사는 공정성 확보를 위해 참여 제한, 신뢰도 반영, 반복 위반 제재 등을 운영정책에 따라 적용할 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제13조 (낙찰 및 거래 확정)">
          <ol style={olStyle}>
            <li>낙찰 결과는 서비스 내 알림 및 화면을 통해 안내됩니다.</li>
            <li>낙찰 이후 거래 일정/인도 등은 서비스가 제공하는 방식(채팅 등)에 따라 진행됩니다.</li>
            <li>회원이 낙찰 이후 정당한 사유 없이 거래를 반복적으로 이행하지 않는 경우 제재 대상이 될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제14조 (금지 품목 및 금지 행위) 🚫">
          <p>
            회사는 관련 법령 및 서비스 안전을 위해 금지 품목의 등록·거래·홍보·알선을 금지합니다. 회사는 금지
            품목으로 판단되는 게시물에 대해 사전 통지 없이 삭제, 노출 제한, 거래 중지, 계정 제재 등의 조치를 할 수
            있습니다.
          </p>

          <div style={{ marginTop: "10px" }}>
            <strong>1) 주류 및 담배류</strong>
            <ul style={ulStyle}>
              <li>주류 전 품목(맥주/소주/와인/위스키 등)</li>
              <li>담배 및 니코틴 제품 전반(일반 담배, 전자담배 기기/액상, 니코틴 파우치 등)</li>
            </ul>

            <strong>2) 의약품 및 의료 관련(원칙적 금지)</strong>
            <ul style={ulStyle}>
              <li>전문의약품/일반의약품, 한약·조제약, 처방전이 필요한 제품</li>
              <li>불법 유통 가능성이 있는 의료기기(허가/인증이 필요한 기기 포함)</li>
            </ul>

            <strong>3) 불법·규제 물품 및 위험물</strong>
            <ul style={ulStyle}>
              <li>마약/향정/유사품, 불법 도박 관련 물품, 불법 복제품</li>
              <li>총포·도검·무기류 및 부품(모형 포함), 폭발물/화약류</li>
              <li>인화성 위험물, 유해 화학물질 등</li>
            </ul>

            <strong>4) 성인물 및 불법 촬영 관련</strong>
            <ul style={ulStyle}>
              <li>음란물, 성적 서비스 알선, 불법 촬영물 및 관련 기기/콘텐츠</li>
              <li>청소년 유해 매체물 및 관련 거래</li>
            </ul>

            <strong>5) 혐오·차별·폭력 조장 물품 및 콘텐츠</strong>
            <ul style={ulStyle}>
              <li>특정 개인/집단에 대한 혐오·차별·폭력·괴롭힘을 조장하는 물품/상징/콘텐츠</li>
              <li>극단주의·테러단체 찬양/선전/상징물, 위협·협박 목적 물품</li>
            </ul>

            <strong>6) 위조/가품, 권리 침해, 불법 유통품</strong>
            <ul style={ulStyle}>
              <li>가품/짝퉁, 상표권·저작권·초상권 침해 물품</li>
              <li>시리얼/인증번호 등 무단 유통, 불법 계정/키 거래</li>
            </ul>

            <strong>7) 장물/분실물/불법 취득품 및 출처 불명</strong>
            <ul style={ulStyle}>
              <li>도난품/장물, 불법 취득 가능성이 높은 물품</li>
              <li>회사가 요구하는 경우 합리적인 출처 증빙을 하지 못하는 고가 품목</li>
            </ul>

            <strong>8) 개인정보 및 계정/권리 거래</strong>
            <ul style={ulStyle}>
              <li>주민번호·전화번호·계좌 등 개인정보 또는 개인정보 포함 자료</li>
              <li>양도가 제한된 계정/멤버십/권리 등</li>
            </ul>

            <strong>9) 기타 법령 또는 운영정책상 제한되는 품목</strong>
            <ul style={ulStyle}>
              <li>관계 법령상 온라인 거래가 제한되거나 회사가 안전상 부적절하다고 판단한 품목</li>
            </ul>
          </div>

          <div style={calloutDangerStyle}>
            <strong>금지 행위(예시)</strong>
            <ul style={{ ...ulStyle, marginTop: "8px" }}>
              <li>허위 매물, 사기, 타인 권리 침해</li>
              <li>욕설/혐오/괴롭힘 등 불쾌감을 주는 행위</li>
              <li>담합, 가격 조작, 자동화 도구 이용 등 비정상 참여</li>
              <li>서비스·시스템 취약점 악용, 데이터 무단 수집(크롤링)</li>
            </ul>
            <p style={{ marginTop: "10px", marginBottom: 0 }}>
              회사는 사안의 중대성에 따라 <strong>경고 없이 영구 이용정지</strong>, 거래 무효, 관계기관 신고 등 조치를 할 수 있습니다.
            </p>
          </div>
        </Section>

        <Section title="제15조 (콘텐츠의 권리 및 이용)">
          <ol style={olStyle}>
            <li>회원이 게시한 콘텐츠의 권리는 원칙적으로 회원에게 귀속됩니다.</li>
            <li>
              회사는 서비스 운영, 노출, 검색/추천, 안전 모니터링 목적 범위에서 필요한 최소한으로 콘텐츠를 사용할 수 있습니다.
            </li>
            <li>회원은 타인의 권리를 침해하지 않는 콘텐츠만 게시해야 하며, 분쟁 발생 시 책임은 게시한 회원에게 있습니다.</li>
          </ol>
        </Section>

        <Section title="제16조 (후기 및 평가)">
          <ol style={olStyle}>
            <li>회원은 거래 경험에 기반한 후기를 작성해야 하며, 허위/비방성 후기는 삭제 및 제재될 수 있습니다.</li>
            <li>회사는 후기의 신뢰성 확보를 위해 작성 조건 및 노출 기준을 운영정책으로 정할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제17조 (유료 서비스 및 수수료) (해당 시)">
          <ol style={olStyle}>
            <li>회사는 일부 기능(예: 노출 부스트, 프리미엄 등)을 유료로 제공할 수 있습니다.</li>
            <li>거래 수수료가 존재하는 경우 수수료율/부과 기준/환불 기준을 서비스 화면에 명확히 고지합니다.</li>
            <li>결제의 취소/환불은 관련 법령 및 회사의 환불 정책에 따릅니다.</li>
          </ol>
        </Section>

        <Section title="제18조 (책임의 제한 및 회원의 면책) 🛡️">
          <ol style={olStyle}>
            <li>
              회사는 플랫폼 제공자로서 합리적인 범위에서 서비스 안정성 및 안전을 위해 노력합니다.
            </li>
            <li>
              회사는 회원 간 거래 또는 회원이 게시한 콘텐츠로 인해 발생한 손해에 대하여 <strong>회사의 고의 또는 중대한 과실이 없는 한</strong> 책임을 부담하지 않습니다.
            </li>
            <li>
              회원이 약관/운영정책/관계 법령을 위반하거나, 허위·불법 콘텐츠 게시, 권리침해, 사기, 공정성 훼손 행위 등으로 인해 회사 또는 제3자에게 손해(민원, 소송, 과징금/벌금, 변호사비용 포함)가 발생한 경우,
              해당 회원은 자신의 책임과 비용으로 이를 해결하고 회사에 발생한 손해를 배상하며 회사를 면책합니다.
            </li>
          </ol>
        </Section>

        <Section title="제19조 (분쟁 해결)">
          <ol style={olStyle}>
            <li>회원 간 분쟁이 발생한 경우 당사자 간 우선 해결을 원칙으로 합니다.</li>
            <li>회사는 신고 처리, 로그 확인 등 필요한 범위에서 분쟁 조정에 협력할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제20조 (준거법 및 관할)">
          <ol style={olStyle}>
            <li>본 약관은 대한민국 법령을 준거법으로 합니다.</li>
            <li>본 약관과 관련된 분쟁에 대한 관할 법원은 민사소송법 등 관계 법령에 따릅니다.</li>
          </ol>
        </Section>

        <p style={{ textAlign: "center", color: "#999", fontSize: "12px", marginTop: "38px" }}>
          부칙: 본 약관은 [YYYY.MM.DD]부터 적용됩니다.
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h3 style={titleStyle}>{title}</h3>
      {children}
    </section>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: "34px" };

const titleStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: "bold",
  marginBottom: "10px",
  color: "#2d3748",
};

const olStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
};

const ulStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  paddingLeft: "18px",
};

const calloutStyle: React.CSSProperties = {
  marginTop: "10px",
  padding: "12px",
  borderRadius: "10px",
  background: "#f7fafc",
  border: "1px solid #edf2f7",
  fontSize: "13px",
  color: "#4a5568",
};

const calloutDangerStyle: React.CSSProperties = {
  marginTop: "14px",
  padding: "14px",
  borderRadius: "12px",
  background: "#fff5f5",
  border: "1px solid #fed7d7",
  fontSize: "13px",
  color: "#742a2a",
};
