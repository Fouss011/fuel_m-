import { Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`
}

function liters(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} L`
}

function dateFr(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}

function buildReportHtml({ title, period, search, rows }) {
  const totalLiters = rows.reduce((sum, row) => sum + Number(row.liters || 0), 0)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const tableRows = rows.map((row) => `
    <tr>
      <td>${row.bon || '-'}</td>
      <td>${row.plate || '-'}</td>
      <td>${row.structure || '-'}</td>
      <td>${liters(row.liters)}</td>
      <td>${money(row.amount)}</td>
      <td>${row.station || '-'}</td>
      <td>${row.pump || '-'}</td>
      <td>${dateFr(row.date)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 26px; margin-bottom: 10px; }
          .meta { margin-bottom: 18px; font-size: 13px; line-height: 1.6; }
          .summary { display: flex; gap: 12px; margin-bottom: 18px; }
          .box { border: 1px solid #D1D5DB; border-radius: 8px; padding: 10px; flex: 1; }
          .box strong { display: block; font-size: 18px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0F172A; color: white; padding: 8px; text-align: left; }
          td { border-bottom: 1px solid #E5E7EB; padding: 7px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>

        <div class="meta">
          <div><strong>Période :</strong> ${period}</div>
          <div><strong>Recherche :</strong> ${search}</div>
        </div>

        <div class="summary">
          <div class="box">Nombre de livraisons<strong>${rows.length}</strong></div>
          <div class="box">Litres servis<strong>${liters(totalLiters)}</strong></div>
          <div class="box">Montant total<strong>${money(totalAmount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Bon</th>
              <th>Plaque</th>
              <th>Division</th>
              <th>Litres</th>
              <th>Montant</th>
              <th>Station</th>
              <th>Pompiste</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `
}

export async function exportFuelReportPdf({
  title = 'Rapport carburant',
  period = 'Toutes périodes',
  search = 'Aucune',
  rows = [],
  fileName = 'rapport-carburant.pdf'
}) {
  const html = buildReportHtml({ title, period, search, rows })

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank')
    win.document.open()
    win.document.write(html)
    win.document.close()
    return null
  }

  const { uri } = await Print.printToFileAsync({ html })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf'
    })
  }

  return uri
}