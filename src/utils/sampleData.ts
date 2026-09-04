/**
 * Creates high-resolution visual synthetic sample images (with watermarks, tables, math, and Arabic text)
 * for testing without requiring external network assets.
 */

function createSampleCanvasImage(
  drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width = 900,
  height = 1200
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, width, height);

  // Border frame
  ctx.strokeStyle = '#E2D9CE';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  drawFn(ctx, width, height);
  return canvas.toDataURL('image/jpeg', 0.95);
}

// 1. Arabic Book Page with Watermark
export function getSampleArabicBook(): string {
  return createSampleCanvasImage((ctx, w, h) => {
    // Watermark behind text
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-35 * Math.PI) / 180);
    ctx.font = 'bold 54px Cairo, Arial';
    ctx.fillStyle = 'rgba(210, 160, 160, 0.22)';
    ctx.textAlign = 'center';
    ctx.fillText('مسودة غير معتمدة - SAMPLE WATERMARK', 0, -120);
    ctx.fillText('حقوق النشر محفوظة للمكتبة ٢٠٢٦ ©', 0, 0);
    ctx.fillText('نسخة تجريبية - DRAFT COPY', 0, 120);
    ctx.restore();

    // Document Header
    ctx.fillStyle = '#1E293B';
    ctx.textAlign = 'right';
    ctx.font = 'bold 30px Cairo, Arial';
    ctx.fillText('كتاب: مناهج المعرفة والحكمة التراثية', w - 60, 90);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 115);
    ctx.lineTo(w - 60, 115);
    ctx.stroke();

    ctx.font = 'bold 24px Cairo, Arial';
    ctx.fillStyle = '#B45309';
    ctx.fillText('الفصل الثالث: في فضل العلوم وتدوين المصنفات', w - 60, 160);

    // Book paragraphs
    ctx.fillStyle = '#334155';
    ctx.font = '20px Cairo, Arial';
    const lines = [
      'اعلم أن تدوين المعارف وحفظ العلوم من أشرف الصنائع وأجلّ المراتب الإنسانية.',
      'وقد قيل: العلم صيدٌ والكتابة قيده، فقيّد صيدك بالحبال الواثقة.',
      'فإذا أردت استيعاب المسائل وتحقيق القواعد، فعليك بحسن الترتيب وتنسيق الأبواب،',
      'والتمييز بين الأصول والفروع، والرجوع إلى ما أثبته الثقات بالدليل والبرهان.',
      '',
      'ومن القواعد الكلية في تدبير المصنفات ما يلي:',
      '١. تحرير المفاهيم بدقة ووضوح دون لبس أو غموض.',
      '٢. إيراد الأمثلة والشواهد لتقريب الغامض من المعاني.',
      '٣. ذكر البراهين الحسابية والمنطقية لإثبات النتائج.',
      '',
      'جدول مقارنة مناهج التدوين والتوثيق:',
    ];

    let y = 210;
    lines.forEach(line => {
      ctx.fillText(line, w - 60, y);
      y += 36;
    });

    // Draw Table
    const tableTop = y + 15;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;

    // Header row
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(60, tableTop, w - 120, 45);
    ctx.strokeRect(60, tableTop, w - 120, 45);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px Cairo, Arial';
    ctx.fillText('المنهج', w - 80, tableTop + 30);
    ctx.fillText('الخصائص البارزة', w - 240, tableTop + 30);
    ctx.fillText('نسبة الدقة', w - 580, tableTop + 30);

    // Row 1
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(60, tableTop + 45, w - 120, 45);
    ctx.strokeRect(60, tableTop + 45, w - 120, 45);
    ctx.fillStyle = '#334155';
    ctx.font = '17px Cairo, Arial';
    ctx.fillText('المنهج الاستقرائي', w - 80, tableTop + 75);
    ctx.fillText('تتبع الجزئيات لاستنباط القاعدة العامة', w - 240, tableTop + 75);
    ctx.fillText('٩٨.٥%', w - 580, tableTop + 75);

    // Row 2
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(60, tableTop + 90, w - 120, 45);
    ctx.strokeRect(60, tableTop + 90, w - 120, 45);
    ctx.fillStyle = '#334155';
    ctx.fillText('المنهج الرياضي التحليلي', w - 80, tableTop + 120);
    ctx.fillText('استخدام المعادلات والبراهين الرقمية', w - 240, tableTop + 120);
    ctx.fillText('٩٩.٩%', w - 580, tableTop + 120);

    // Page Number
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.font = '16px Cairo, Arial';
    ctx.fillText('— صفحة ٤٧ من كتاب التراث —', w / 2, h - 45);
  });
}

// 2. Math & Arithmetic Sheet
export function getSampleMathSheet(): string {
  return createSampleCanvasImage((ctx, w, h) => {
    // Watermark
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = 'rgba(200, 200, 230, 0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('EXAMINATION DRAFT - نموذج اختبار', 0, 0);
    ctx.restore();

    // Header
    ctx.fillStyle = '#1E3A8A';
    ctx.textAlign = 'right';
    ctx.font = 'bold 28px Cairo, Arial';
    ctx.fillText('اختبار الرياضيات والعمليات الحسابية المتقدمة', w - 60, 90);

    ctx.fillStyle = '#64748B';
    ctx.font = '18px Cairo, Arial';
    ctx.fillText('الاسم: .......................................   التاريخ: ٢٠٢٦/٠٩/٠٤', w - 60, 130);

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 150);
    ctx.lineTo(w - 60, 150);
    ctx.stroke();

    // Section 1: Arithmetic & Formulas
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Cairo, Arial';
    ctx.fillText('القسم الأول: العمليات الحسابية والجبرية', w - 60, 195);

    const mathItems = [
      '١. احسب قيمة المقدار: 25 × (4 + 16) - 150 ÷ 3 = 450',
      '٢. نظرية فيثاغورس في المثلث القائم: a² + b² = c²  حيث c = √(3² + 4²) = 5',
      '٣. مساحة الدائرة: Area = π × r²   (عندما r = 7cm فإن Area ≈ 153.94 cm²)',
      '٤. معادلة الدرجة الثانية: x² - 5x + 6 = 0  => (x - 2)(x - 3) = 0 => x = 2 أو x = 3',
      '٥. حساب النسبة المئوية: (450 ÷ 600) × 100% = 75%',
    ];

    let y = 245;
    ctx.fillStyle = '#334155';
    ctx.font = '20px Cairo, Arial';
    mathItems.forEach(item => {
      // Background formula box
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(60, y - 25, w - 120, 42);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(60, y - 25, w - 120, 42);

      ctx.fillStyle = '#1E293B';
      ctx.fillText(item, w - 80, y + 4);
      y += 62;
    });

    // Section 2: Table of Operations
    y += 20;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Cairo, Arial';
    ctx.fillText('القسم الثاني: جدول النتائج المالية والإحصائية', w - 60, y);

    const tableTop = y + 20;
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(60, tableTop, w - 120, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 17px Cairo, Arial';
    ctx.fillText('البند', w - 80, tableTop + 26);
    ctx.fillText('الكمية (Q)', w - 240, tableTop + 26);
    ctx.fillText('سعر الوحدة', w - 420, tableTop + 26);
    ctx.fillText('الإجمالي الكلي', w - 600, tableTop + 26);

    const rows = [
      ['تراخيص الحزمة البرمجية', '12', '$150.00', '$1,800.00'],
      ['سيرفرات سحابية شهرية', '4', '$320.00', '$1,280.00'],
      ['خدمات الدعم الفني المباشر', '1', '$500.00', '$500.00'],
      ['المجموع الكلي مع الخصم 5%', '—', '—', '$3,396.00'],
    ];

    rows.forEach((r, idx) => {
      const ry = tableTop + 40 + idx * 40;
      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(60, ry, w - 120, 40);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(60, ry, w - 120, 40);

      ctx.fillStyle = idx === 3 ? '#B45309' : '#334155';
      ctx.font = idx === 3 ? 'bold 16px Cairo, Arial' : '16px Cairo, Arial';
      ctx.fillText(r[0], w - 80, ry + 25);
      ctx.fillText(r[1], w - 240, ry + 25);
      ctx.fillText(r[2], w - 420, ry + 25);
      ctx.fillText(r[3], w - 600, ry + 25);
    });
  });
}

// 3. Bilingual Official Document / Invoice
export function getSampleBilingualInvoice(): string {
  return createSampleCanvasImage((ctx, w, h) => {
    // Stamp watermark
    ctx.save();
    ctx.translate(w / 2 + 100, h / 2 - 50);
    ctx.rotate((15 * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-120, -50, 240, 100);
    ctx.font = 'bold 24px Arial, Cairo';
    ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('PAID & CERTIFIED', 0, -10);
    ctx.fillText('معتمد ومدفوع', 0, 24);
    ctx.restore();

    // Top Header
    ctx.fillStyle = '#065F46';
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px Cairo, Arial';
    ctx.fillText('شركة التقنيات الذكية المحدودة | SMART TECH LTD', w - 60, 90);

    ctx.fillStyle = '#64748B';
    ctx.font = '16px Cairo, Arial';
    ctx.fillText('رقم الفاتورة: INV-2026-8891 | Invoice Number: INV-2026-8891', w - 60, 125);
    ctx.fillText('تاريخ الإصدار: 04 سبتمبر 2026 | Issue Date: Sep 04, 2026', w - 60, 155);

    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(w - 60, 180);
    ctx.stroke();

    // Info cards
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(60, 200, w - 120, 90);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(60, 200, w - 120, 90);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px Cairo, Arial';
    ctx.fillText('بيانات العميل / Client Details:', w - 80, 230);
    ctx.font = '16px Cairo, Arial';
    ctx.fillStyle = '#475569';
    ctx.fillText('مؤسسة الأفق للاستشارات والحلول الرقمية (Al-Ufuq Digital)', w - 80, 260);

    // Invoice Table
    const tableTop = 320;
    ctx.fillStyle = '#065F46';
    ctx.fillRect(60, tableTop, w - 120, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Cairo, Arial';
    ctx.fillText('الوصف / Description', w - 80, tableTop + 27);
    ctx.fillText('الساعات / Hrs', w - 380, tableTop + 27);
    ctx.fillText('المعدل / Rate', w - 500, tableTop + 27);
    ctx.fillText('المجموع / Total', w - 650, tableTop + 27);

    const items = [
      ['تطوير نظام الذكاء الاصطناعي والتعرف الضوئي OCR', '40', '$85.00', '$3,400.00'],
      ['إعداد البنية التحتية السحابية والمزامنة الآمنة', '25', '$90.00', '$2,250.00'],
      ['تصميم واجهات المستخدم الفاخرة متعددة اللغات', '30', '$75.00', '$2,250.00'],
      ['ضريبة القيمة المضافة VAT (15%)', '—', '—', '$1,185.00'],
      ['صافي المستحق النهائي (Grand Total)', '—', '—', '$9,085.00'],
    ];

    items.forEach((item, idx) => {
      const iy = tableTop + 42 + idx * 42;
      ctx.fillStyle = idx === 4 ? '#ECFDF5' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(60, iy, w - 120, 42);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(60, iy, w - 120, 42);

      ctx.fillStyle = idx === 4 ? '#065F46' : '#1E293B';
      ctx.font = idx === 4 ? 'bold 16px Cairo, Arial' : '15px Cairo, Arial';
      ctx.fillText(item[0], w - 80, iy + 26);
      ctx.fillText(item[1], w - 380, iy + 26);
      ctx.fillText(item[2], w - 500, iy + 26);
      ctx.fillText(item[3], w - 650, iy + 26);
    });

    // Terms
    ctx.fillStyle = '#64748B';
    ctx.font = '14px Cairo, Arial';
    ctx.fillText('الشروط: يتم السداد خلال 14 يوماً من تاريخ الفاتورة | Terms: Net 14 days', w - 60, h - 80);
  });
}
