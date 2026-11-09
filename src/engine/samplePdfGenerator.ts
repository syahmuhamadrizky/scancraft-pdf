import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateSampleWordPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1: A4 (595 x 842 pt)
  const page1 = doc.addPage([595, 842]);
  const { width, height } = page1.getSize();

  // Letterhead blue bar
  page1.drawRectangle({
    x: 56,
    y: height - 72,
    width: width - 112,
    height: 4,
    color: rgb(0.11, 0.31, 0.65),
  });

  page1.drawText('PT NUSANTARA KARYA DIGITAL', {
    x: 56,
    y: height - 56,
    size: 15,
    font: fontBold,
    color: rgb(0.09, 0.22, 0.45),
  });

  page1.drawText('Jl. Jenderal Sudirman Kav. 52, Jakarta Selatan 12190 | Telp. (021) 555-0192', {
    x: 56,
    y: height - 90,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.38, 0.41, 0.46),
  });

  // Document Title
  page1.drawText('SURAT KETERANGAN PENYERAHAN DOKUMEN', {
    x: 120,
    y: height - 138,
    size: 13.5,
    font: fontBold,
    color: rgb(0.08, 0.09, 0.11),
  });

  page1.drawText('Nomor: 048/NKD-ADM/XI/2026', {
    x: 205,
    y: height - 156,
    size: 10,
    font: fontRegular,
    color: rgb(0.25, 0.28, 0.32),
  });

  // Body paragraphs
  const lines = [
    'Yang bertanda tangan di bawah ini, Manajemen Administrasi PT Nusantara Karya Digital,',
    'menerangkan bahwa berkas dokumen di bawah ini telah diperiksa, diverifikasi, dan',
    'dinyatakan lengkap sesuai dengan standar operasional perusahaan:',
  ];

  let y = height - 196;
  for (const line of lines) {
    page1.drawText(line, {
      x: 56,
      y,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.1, 0.11, 0.13),
    });
    y -= 17;
  }

  // Word-style bordered table
  const tableTop = y - 16;
  const colWidths = [42, 225, 110, 106];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 26;
  const rows = [
    ['No', 'Nama Berkas / Dokumen', 'Status', 'Keterangan'],
    ['1', 'Formulir Pengajuan Proyek Q4', 'Terverifikasi', 'Sesuai Lampiran A'],
    ['2', 'Rekapitulasi Anggaran Operasional', 'Disetujui', 'Tanda Tangan Basah'],
    ['3', 'Berita Acara Serah Terima (BAST)', 'Terverifikasi', 'Arsip Kantor Pusat'],
    ['4', 'Surat Pernyataan Kepatuhan', 'Lengkap', 'Salinan Resmi'],
  ];

  rows.forEach((row, rIdx) => {
    const ry = tableTop - rIdx * rowHeight;
    if (rIdx === 0) {
      page1.drawRectangle({
        x: 56,
        y: ry - rowHeight,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.92, 0.94, 0.98),
      });
    }
    page1.drawRectangle({
      x: 56,
      y: ry - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0.28, 0.31, 0.36),
      borderWidth: 0.8,
    });

    let cx = 56;
    row.forEach((cell, cIdx) => {
      if (cIdx > 0) {
        page1.drawLine({
          start: { x: cx, y: ry },
          end: { x: cx, y: ry - rowHeight },
          thickness: 0.8,
          color: rgb(0.28, 0.31, 0.36),
        });
      }
      page1.drawText(cell, {
        x: cx + 8,
        y: ry - 17,
        size: 9.5,
        font: rIdx === 0 ? fontBold : fontRegular,
        color: rgb(0.1, 0.11, 0.13),
      });
      cx += colWidths[cIdx];
    });
  });

  // Closing paragraph
  let cy = tableTop - rows.length * rowHeight - 28;
  const closing = [
    'Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan',
    'sebagaimana mestinya. Perubahan terhadap lampiran hanya berlaku apabila disertai cap',
    'resmi dan tanda tangan pejabat berwenang.',
  ];
  for (const line of closing) {
    page1.drawText(line, {
      x: 56,
      y: cy,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.1, 0.11, 0.13),
    });
    cy -= 17;
  }

  // Signature block & blue vector stamp
  const sigY = cy - 42;
  page1.drawText('Jakarta, 9 November 2026', {
    x: 365,
    y: sigY,
    size: 10,
    font: fontRegular,
    color: rgb(0.12, 0.13, 0.15),
  });
  page1.drawText('Kepala Divisi Administrasi,', {
    x: 365,
    y: sigY - 16,
    size: 10,
    font: fontRegular,
    color: rgb(0.12, 0.13, 0.15),
  });

  // Blue circular stamp
  page1.drawCircle({
    x: 382,
    y: sigY - 56,
    size: 28,
    borderColor: rgb(0.12, 0.33, 0.78),
    borderWidth: 1.8,
    opacity: 0.82,
  });
  page1.drawCircle({
    x: 382,
    y: sigY - 56,
    size: 23,
    borderColor: rgb(0.12, 0.33, 0.78),
    borderWidth: 0.9,
    opacity: 0.82,
  });
  page1.drawText('DISAHKAN', {
    x: 360,
    y: sigY - 59,
    size: 7.5,
    font: fontBold,
    color: rgb(0.12, 0.33, 0.78),
  });

  // Stylized signature stroke
  page1.drawSvgPath(
    'M 0 20 C 12 2, 22 32, 34 10 C 44 -4, 52 28, 68 14 C 82 2, 96 20, 118 12',
    {
      x: 368,
      y: sigY - 40,
      borderColor: rgb(0.06, 0.1, 0.25),
      borderWidth: 1.7,
    }
  );

  page1.drawText('Budi Santoso, S.Kom.', {
    x: 365,
    y: sigY - 94,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.11, 0.13),
  });
  page1.drawText('NIP. 19910412-0082', {
    x: 365,
    y: sigY - 108,
    size: 8.5,
    font: fontItalic,
    color: rgb(0.35, 0.38, 0.42),
  });

  // Footer
  page1.drawText('Halaman 1 dari 2 • Contoh Dokumen Export Word', {
    x: 56,
    y: 42,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.48, 0.52),
  });

  // Page 2: Checklist & Notes
  const page2 = doc.addPage([595, 842]);
  page2.drawText('LAMPIRAN: CATATAN PEMERIKSAAN BERKAS', {
    x: 56,
    y: height - 68,
    size: 12.5,
    font: fontBold,
    color: rgb(0.09, 0.22, 0.45),
  });
  page2.drawLine({
    start: { x: 56, y: height - 78 },
    end: { x: width - 56, y: height - 78 },
    thickness: 1,
    color: rgb(0.8, 0.82, 0.86),
  });

  const notes = [
    '1. Seluruh dokumen lampiran telah diperiksa keaslian serta kelengkapan halamannya.',
    '2. Teks berwarna biru, tabel, dan stempel pada halaman 1 berfungsi sebagai simulasi',
    '   dokumen hasil Save As PDF dari Microsoft Word sebelum diberi efek scan.',
    '3. Coba geser slider "Kemiringan", "Noise Kertas", dan "Bayangan Pinggir" di panel kanan',
    '   untuk melihat perubahan halaman 1 maupun halaman 2 secara langsung.',
  ];
  let ny = height - 112;
  for (const n of notes) {
    page2.drawText(n, {
      x: 56,
      y: ny,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.12, 0.13, 0.15),
    });
    ny -= 19;
  }

  page2.drawText('Halaman 2 dari 2 • Contoh Dokumen Export Word', {
    x: 56,
    y: 42,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.48, 0.52),
  });

  return await doc.save();
}

