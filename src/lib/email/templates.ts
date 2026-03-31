export function consultationReminderEmail(
  studentName: string,
  teacherName: string,
  date: string
): string {
  const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1f2937;
        }
        .content {
            margin-bottom: 24px;
        }
        .content p {
            margin: 12px 0;
        }
        .info-box {
            background: #f3f4f6;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-box strong {
            display: block;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>📅 상담 일정 알림</h1>
            </div>
            <div class="content">
                <p>안녕하세요, <strong>${studentName}</strong>님!</p>
                <p>예정된 상담이 있습니다.</p>

                <div class="info-box">
                    <strong>상담 정보</strong>
                    <p><strong>담당 선생님:</strong> ${teacherName}</p>
                    <p><strong>일시:</strong> ${formattedDate}</p>
                </div>

                <p>시간을 맞춰 참석해 주시기 바랍니다.</p>
                <p>문의사항이 있으시면 언제든지 문의해 주세요.</p>
            </div>
            <div class="footer">
                <p>이 이메일은 EduTrack 시스템에서 자동으로 발송되었습니다.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}

export function paymentDueEmail(
  studentName: string,
  amount: number,
  dueDate: string
): string {
  const formattedAmount = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)

  const formattedDate = new Date(dueDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1f2937;
        }
        .content {
            margin-bottom: 24px;
        }
        .content p {
            margin: 12px 0;
        }
        .payment-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .payment-box strong {
            display: block;
            color: #92400e;
            margin-bottom: 8px;
        }
        .amount {
            font-size: 20px;
            color: #b45309;
            font-weight: bold;
        }
        .cta-button {
            display: inline-block;
            background: #f59e0b;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>💳 등록금 납부 안내</h1>
            </div>
            <div class="content">
                <p>안녕하세요, <strong>${studentName}</strong>님!</p>
                <p>등록금 납부 기일이 다가왔습니다.</p>

                <div class="payment-box">
                    <strong>납부 정보</strong>
                    <p><strong>납부 금액:</strong> <span class="amount">${formattedAmount}</span></p>
                    <p><strong>납부 기한:</strong> ${formattedDate}</p>
                </div>

                <p>위 기한 이내에 납부해 주시기 바랍니다.</p>
                <p>결제 관련 문의사항이 있으시면 연락주세요.</p>
            </div>
            <div class="footer">
                <p>이 이메일은 EduTrack 시스템에서 자동으로 발송되었습니다.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}

export function newConsultationEmail(
  studentName: string,
  teacherName: string,
  type: string
): string {
  const typeLabel: { [key: string]: string } = {
    academic: '학습 상담',
    career: '진로 상담',
    university: '대학 입시 상담',
    general: '일반 상담',
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1f2937;
        }
        .content {
            margin-bottom: 24px;
        }
        .content p {
            margin: 12px 0;
        }
        .info-box {
            background: #dcfce7;
            border-left: 4px solid #22c55e;
            padding: 16px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-box strong {
            display: block;
            color: #15803d;
            margin-bottom: 8px;
        }
        .cta-button {
            display: inline-block;
            background: #22c55e;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>💬 새로운 상담 일정이 등록되었습니다</h1>
            </div>
            <div class="content">
                <p>안녕하세요, <strong>${studentName}</strong>님!</p>
                <p>새로운 상담 일정이 등록되었습니다.</p>

                <div class="info-box">
                    <strong>상담 정보</strong>
                    <p><strong>담당 선생님:</strong> ${teacherName}</p>
                    <p><strong>상담 유형:</strong> ${typeLabel[type] || type}</p>
                </div>

                <p>상담 일정 상세 정보는 대시보드에서 확인하실 수 있습니다.</p>
                <p>궁금한 점이 있으시면 선생님과 상담하시기 바랍니다.</p>
            </div>
            <div class="footer">
                <p>이 이메일은 EduTrack 시스템에서 자동으로 발송되었습니다.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}

export function applicationUpdateEmail(
  studentName: string,
  university: string,
  status: string
): string {
  const statusLabel: { [key: string]: string } = {
    draft: '작성 중',
    submitted: '제출 완료',
    accepted: '합격',
    rejected: '불합격',
    waitlisted: '대기 중',
  }

  const statusColor: { [key: string]: string } = {
    draft: '#94a3b8',
    submitted: '#3b82f6',
    accepted: '#22c55e',
    rejected: '#ef4444',
    waitlisted: '#f59e0b',
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1f2937;
        }
        .content {
            margin-bottom: 24px;
        }
        .content p {
            margin: 12px 0;
        }
        .status-box {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }
        .university-name {
            font-size: 18px;
            color: #1f2937;
            font-weight: bold;
            margin-top: 12px;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>🎓 입시 진행 상황 업데이트</h1>
            </div>
            <div class="content">
                <p>안녕하세요, <strong>${studentName}</strong>님!</p>
                <p>대학 입시 진행 상황이 업데이트되었습니다.</p>

                <div class="status-box">
                    <div class="university-name">${university}</div>
                    <div class="status-badge" style="background-color: ${statusColor[status] || '#6b7280'}">
                        ${statusLabel[status] || status}
                    </div>
                </div>

                <p>입시 진행 상황의 자세한 내용은 대시보드에서 확인하실 수 있습니다.</p>
                <p>더 이상의 업데이트를 기다리고 있겠습니다.</p>
            </div>
            <div class="footer">
                <p>이 이메일은 EduTrack 시스템에서 자동으로 발송되었습니다.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}
