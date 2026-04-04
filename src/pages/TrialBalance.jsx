import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ChevronRight, ChevronDown } from "lucide-react";
import moment from "moment";

export default function TrialBalance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => moment().startOf('year').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/trial-balance?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' });
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleGroup = (gKey) => setCollapsedGroups(prev => ({ ...prev, [gKey]: !prev[gKey] }));

  // Group rows by group_id (or 'ungrouped')
  const groupedData = data.reduce((acc, row) => {
    const key = row.group_id || 'ungrouped';
    if (!acc[key]) {
      acc[key] = {
        group_id: row.group_id || null,
        group_name: row.group_name || 'Pa Grup',
        group_name_en: row.group_name_en || '',
        code_prefix_start: row.code_prefix_start || '',
        group_sequence: row.group_sequence || 9999,
        rows: [],
      };
    }
    acc[key].rows.push(row);
    return acc;
  }, {});

  const sortedGroups = Object.values(groupedData).sort((a, b) => {
    if (a.group_id === null) return 1;
    if (b.group_id === null) return -1;
    return (a.group_sequence - b.group_sequence) || a.code_prefix_start.localeCompare(b.code_prefix_start);
  });

  const totalDebit = data.reduce((s, r) => s + (parseFloat(r.total_debit) || 0), 0);
  const totalCredit = data.reduce((s, r) => s + (parseFloat(r.total_credit) || 0), 0);

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = 210, margin = 14;

    doc.setFillColor(107, 114, 126);
    doc.rect(0, 0, W, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILANCI I PROVËS (TRIAL BALANCE)', margin, 15);
    doc.setFontSize(8);
    doc.text(`${moment(dateFrom).format('DD/MM/YYYY')} - ${moment(dateTo).format('DD/MM/YYYY')}`, W - margin, 15, { align: 'right' });

    let y = 35;
    doc.setFillColor(107, 114, 126);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.rect(margin, y - 4, W - margin * 2, 7, 'F');
    doc.text('Kodi', margin + 2, y);
    doc.text('Llogaria', margin + 25, y);
    doc.text('Debit', margin + 120, y);
    doc.text('Kredit', W - margin - 2, y, { align: 'right' });
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    sortedGroups.forEach(grp => {
      if (y > 265) { doc.addPage(); y = 20; }
      // Group header
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y - 3, W - margin * 2, 5, 'F');
      doc.text(grp.group_name, margin + 2, y);
      y += 6;
      doc.setFont('helvetica', 'normal');

      grp.rows.forEach((row, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(margin, y - 3, W - margin * 2, 5, 'F'); }
        doc.text(row.code, margin + 6, y);
        doc.text(row.name.slice(0, 38), margin + 25, y);
        const d = parseFloat(row.total_debit) || 0;
        const cr = parseFloat(row.total_credit) || 0;
        doc.text(d > 0 ? d.toFixed(2) : '-', margin + 120, y);
        doc.text(cr > 0 ? cr.toFixed(2) : '-', W - margin - 2, y, { align: 'right' });
        y += 5;
      });

      // Group subtotal
      const gDebit = grp.rows.reduce((s, r) => s + (parseFloat(r.total_debit) || 0), 0);
      const gCredit = grp.rows.reduce((s, r) => s + (parseFloat(r.total_credit) || 0), 0);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, y - 3, W - margin * 2, 5, 'F');
      doc.text(`Nëntotali: ${grp.group_name}`, margin + 2, y);
      doc.text(gDebit.toFixed(2), margin + 120, y);
      doc.text(gCredit.toFixed(2), W - margin - 2, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 7;
    });

    doc.setFillColor(107, 114, 126);
    doc.rect(margin, y + 2, W - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALI', margin + 25, y + 7);
    doc.text(totalDebit.toFixed(2), margin + 120, y + 7);
    doc.text(totalCredit.toFixed(2), W - margin - 2, y + 7, { align: 'right' });

    doc.save(`bilanci-proves-${dateFrom}-${dateTo}.pdf`);
  };

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wsData = [['Kodi', 'Llogaria', 'Grupi', 'Lloji', 'Debit', 'Kredit']];
    sortedGroups.forEach(grp => {
      wsData.push([`--- ${grp.group_name} ---`, '', '', '', '', '']);
      grp.rows.forEach(r => {
        wsData.push([r.code, r.name, grp.group_name, r.account_type, parseFloat(r.total_debit) || 0, parseFloat(r.total_credit) || 0]);
      });
      const gD = grp.rows.reduce((s, r) => s + (parseFloat(r.total_debit) || 0), 0);
      const gC = grp.rows.reduce((s, r) => s + (parseFloat(r.total_credit) || 0), 0);
      wsData.push(['', `Nëntotali: ${grp.group_name}`, '', '', gD, gC]);
    });
    wsData.push(['', 'TOTALI', '', '', totalDebit, totalCredit]);
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Bilanci i Provës');
    writeFile(wb, `bilanci-proves-${dateFrom}-${dateTo}.xlsx`);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Raporte Financiare</p>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Bilanci i Provës</h1>
        <p className="text-sm text-muted-foreground mt-1">Trial Balance – Përmbledhje sipas grupeve të llogarive</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Nga data</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-date-from" />
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-2 block">Deri në datë</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-date-to" />
          </div>
          <Button onClick={loadData} disabled={loading} data-testid="button-generate">{loading ? 'Duke ngarkuar...' : 'Gjenero'}</Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2" data-testid="button-export-pdf"><Download className="w-4 h-4" /> PDF</Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2" data-testid="button-export-excel"><Download className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left py-3 px-6 font-semibold text-muted-foreground w-24">Kodi</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Llogaria</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-28">Lloji</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground w-32">Debit</th>
              <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-32">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-muted-foreground">Nuk ka të dhëna për këtë periudhë</td></tr>
            ) : sortedGroups.map(grp => {
              const isCollapsed = collapsedGroups[grp.group_id || 'ungrouped'];
              const gDebit = grp.rows.reduce((s, r) => s + (parseFloat(r.total_debit) || 0), 0);
              const gCredit = grp.rows.reduce((s, r) => s + (parseFloat(r.total_credit) || 0), 0);
              return (
                <>
                  {/* Group header row */}
                  <tr
                    key={`grp-${grp.group_id || 'ung'}`}
                    className="bg-muted/30 border-b border-border/30 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleGroup(grp.group_id || 'ungrouped')}
                    data-testid={`row-tb-group-${grp.group_id || 'ungrouped'}`}
                  >
                    <td className="py-2 px-6" colSpan={2}>
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="font-semibold text-sm">{grp.group_name}</span>
                        {grp.group_name_en && <span className="text-xs text-muted-foreground">({grp.group_name_en})</span>}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-muted-foreground text-xs">{grp.rows.length} llogari</td>
                    <td className="py-2 px-4 text-right font-mono font-semibold text-sm">{gDebit > 0 ? gDebit.toFixed(2) : '—'}</td>
                    <td className="py-2 px-6 text-right font-mono font-semibold text-sm">{gCredit > 0 ? gCredit.toFixed(2) : '—'}</td>
                  </tr>
                  {/* Account rows under group */}
                  {!isCollapsed && grp.rows.map((row, i) => (
                    <tr key={row.id} className={`${i % 2 === 0 ? 'bg-muted/5' : 'bg-white'} border-b border-border/10`} data-testid={`row-tb-${row.code}`}>
                      <td className="py-2.5 px-6 pl-10 font-mono font-semibold text-sm">{row.code}</td>
                      <td className="py-2.5 px-4">{row.name}</td>
                      <td className="py-2.5 px-4 capitalize text-muted-foreground text-xs">{row.account_type}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm">{parseFloat(row.total_debit) > 0 ? parseFloat(row.total_debit).toFixed(2) : '—'}</td>
                      <td className="py-2.5 px-6 text-right font-mono text-sm">{parseFloat(row.total_credit) > 0 ? parseFloat(row.total_credit).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                  {/* Group subtotal row */}
                  {!isCollapsed && (
                    <tr key={`sub-${grp.group_id || 'ung'}`} className="bg-muted/20 border-b border-border/30">
                      <td colSpan={3} className="py-2 px-6 pl-10 text-xs font-semibold text-muted-foreground">Nëntotali: {grp.group_name}</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-sm text-foreground">{gDebit.toFixed(2)}</td>
                      <td className="py-2 px-6 text-right font-mono font-bold text-sm text-foreground">{gCredit.toFixed(2)}</td>
                    </tr>
                  )}
                </>
              );
            })}
            {data.length > 0 && (
              <tr className="border-t-2 border-foreground font-bold bg-primary/5">
                <td colSpan={3} className="py-3 px-6 text-sm font-bold">Totali i Përgjithshëm</td>
                <td className="py-3 px-4 text-right font-mono font-bold">{totalDebit.toFixed(2)}</td>
                <td className="py-3 px-6 text-right font-mono font-bold">{totalCredit.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
