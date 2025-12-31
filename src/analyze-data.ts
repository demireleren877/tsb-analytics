import * as fs from 'fs';
import * as path from 'path';
import { ExcelParser, CompanyData } from './excel-parser';

function generateHTMLReport(data: CompanyData[], outputPath: string): void {
  // İlk 10 şirketi prim üretimine göre sırala
  const latestQuarter = data.reduce((max, item) => {
    const period = item.year * 10 + item.quarter;
    return period > max ? period : max;
  }, 0);

  const latestYear = Math.floor(latestQuarter / 10);
  const latestQ = latestQuarter % 10;

  const latestData = data.filter(d => d.year === latestYear && d.quarter === latestQ);

  // Yazılan prim kolonunu bul
  const sampleData = latestData[0];
  const premiumKeys = sampleData ? Object.keys(sampleData).filter(k =>
    k.toLowerCase().includes('written') ||
    k.toLowerCase().includes('yazılan') ||
    k.toLowerCase().includes('yazilan') ||
    k.toLowerCase().includes('premium') ||
    k.toLowerCase().includes('prim')
  ) : [];

  const premiumKey = premiumKeys[0] || Object.keys(sampleData || {}).find(k =>
    typeof sampleData[k] === 'number' && sampleData[k] > 1000
  );

  console.log(`\n📊 Using premium column: ${premiumKey}`);

  // Şirketleri prim üretimine göre sırala
  const sortedCompanies = latestData
    .filter(d => d[premiumKey!] && d[premiumKey!] > 0)
    .sort((a, b) => (b[premiumKey!] || 0) - (a[premiumKey!] || 0))
    .slice(0, 10);

  // Eureko'yu ekle
  const eurekoData = latestData.find(d =>
    d.companyName.toLowerCase().includes('eureko')
  );

  if (eurekoData && !sortedCompanies.find(c => c.companyName === eurekoData.companyName)) {
    sortedCompanies.push(eurekoData);
  }

  // Tüm çeyreklerdeki veriyi topla (trend için)
  const timeSeriesData: {[company: string]: {year: number, quarter: number, value: number}[]} = {};

  sortedCompanies.forEach(company => {
    const companyHistory = data
      .filter(d => d.companyName === company.companyName && d[premiumKey!])
      .map(d => ({
        year: d.year,
        quarter: d.quarter,
        value: d[premiumKey!] || 0
      }))
      .sort((a, b) => (a.year * 10 + a.quarter) - (b.year * 10 + b.quarter));

    timeSeriesData[company.companyName] = companyHistory;
  });

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TSB Sigorta Analizi - ${latestYear} Q${latestQ}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 2.5em;
      color: #667eea;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 40px;
      font-size: 1.1em;
    }
    .chart-container {
      position: relative;
      height: 500px;
      margin-bottom: 40px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .number {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .rank {
      font-weight: bold;
      color: #667eea;
      text-align: center;
      font-size: 1.2em;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏢 TSB Sigorta Şirketleri Analizi</h1>
    <p class="subtitle">${latestYear} Yılı ${latestQ}. Çeyrek - Prim Üretimi</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Şirket</div>
        <div class="stat-value">${latestData.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Analiz Edilen Dönem</div>
        <div class="stat-value">${latestYear} Q${latestQ}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Toplam Prim (Milyon TL)</div>
        <div class="stat-value">${(sortedCompanies.reduce((sum, c) => sum + (c[premiumKey!] || 0), 0) / 1000000).toFixed(0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">En Yüksek Prim</div>
        <div class="stat-value">${(sortedCompanies[0]?.[premiumKey!] / 1000000 || 0).toFixed(0)}M</div>
      </div>
    </div>

    <div class="chart-container">
      <canvas id="premiumChart"></canvas>
    </div>

    <div class="chart-container">
      <canvas id="trendChart"></canvas>
    </div>

    <h2 style="margin-top: 40px; margin-bottom: 20px; color: #667eea;">📊 İlk 10 Şirket + Eureko</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">Sıra</th>
          <th>Şirket Adı</th>
          <th class="number">Prim Üretimi (TL)</th>
          <th class="number">Milyon TL</th>
        </tr>
      </thead>
      <tbody>
        ${sortedCompanies.map((company, index) => `
          <tr ${company.companyName.toLowerCase().includes('eureko') ? 'style="background: #fff3cd;"' : ''}>
            <td class="rank">${index + 1}</td>
            <td>${company.companyName}</td>
            <td class="number">${(company[premiumKey!] || 0).toLocaleString('tr-TR')}</td>
            <td class="number">${((company[premiumKey!] || 0) / 1000000).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>📅 Rapor Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
      <p>📊 Kaynak: Türkiye Sigorta Birliği (TSB)</p>
      <p>🤖 TSB File Monitor tarafından otomatik oluşturulmuştur</p>
    </div>
  </div>

  <script>
    // Bar Chart - Prim Üretimi
    const ctx1 = document.getElementById('premiumChart').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(sortedCompanies.map(c => c.companyName))},
        datasets: [{
          label: 'Prim Üretimi (Milyon TL)',
          data: ${JSON.stringify(sortedCompanies.map(c => (c[premiumKey!] || 0) / 1000000))},
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)',
            'rgba(255, 154, 158, 0.8)',
            'rgba(250, 208, 196, 0.8)',
            'rgba(189, 224, 254, 0.8)',
            'rgba(162, 210, 255, 0.8)',
            'rgba(134, 199, 243, 0.8)',
            'rgba(106, 189, 230, 0.8)',
            'rgba(78, 178, 218, 0.8)',
            'rgba(255, 235, 59, 0.8)'
          ],
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: '${latestYear} Q${latestQ} - Şirket Bazında Prim Üretimi',
            font: { size: 18 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('tr-TR') + 'M';
              }
            }
          }
        }
      }
    });

    // Line Chart - Trend
    const ctx2 = document.getElementById('trendChart').getContext('2d');
    const timeSeriesData = ${JSON.stringify(timeSeriesData)};

    const datasets = Object.keys(timeSeriesData).map((company, index) => {
      const colors = [
        'rgb(102, 126, 234)',
        'rgb(118, 75, 162)',
        'rgb(237, 100, 166)',
        'rgb(255, 154, 158)',
        'rgb(250, 208, 196)',
        'rgb(189, 224, 254)',
        'rgb(162, 210, 255)',
        'rgb(134, 199, 243)',
        'rgb(106, 189, 230)',
        'rgb(78, 178, 218)',
        'rgb(255, 235, 59)'
      ];

      return {
        label: company,
        data: timeSeriesData[company].map(d => ({
          x: d.year + '-Q' + d.quarter,
          y: d.value / 1000000
        })),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '33',
        tension: 0.4
      };
    });

    new Chart(ctx2, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right' },
          title: {
            display: true,
            text: 'Prim Üretimi Trendi (Çeyreksel)',
            font: { size: 18 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('tr-TR') + 'M';
              }
            }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`\n✅ HTML report generated: ${outputPath}`);
}

async function main() {
  console.log('🚀 TSB Data Analyzer');
  console.log('='.repeat(60));

  const datasDir = './datas';
  const files = fs.readdirSync(datasDir)
    .filter(f => f.endsWith('.xlsx') && !f.includes('~') && f !== 'combined_data.xlsx')
    .map(f => path.join(datasDir, f));

  if (files.length === 0) {
    console.log('\n❌ No Excel files found in datas directory');
    console.log('💡 Run: npm run bulk-download 2020');
    return;
  }

  console.log(`\n📂 Found ${files.length} Excel file(s)\n`);

  // İlk dosyayı inspect et
  console.log('🔍 Inspecting first file...');
  ExcelParser.inspectExcel(files[0]);

  // Tüm dosyaları parse et
  console.log('\n📊 Parsing all files...');
  const data = ExcelParser.parseMultipleFiles(files);

  console.log(`\n✅ Parsed ${data.length} company records`);

  // Export to CSV
  const csvPath = path.join(datasDir, 'analysis-data.csv');
  ExcelParser.exportToCSV(data, csvPath);

  // Export to JSON
  const jsonPath = path.join(datasDir, 'analysis-data.json');
  ExcelParser.exportToJSON(data, jsonPath);

  // Generate HTML report
  const htmlPath = path.join(datasDir, 'analysis-report.html');
  generateHTMLReport(data, htmlPath);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis completed!');
  console.log(`   CSV: ${csvPath}`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   HTML: ${htmlPath}`);
  console.log('\n💡 Open the HTML file in your browser to see charts!');
  console.log('='.repeat(60) + '\n');
}

main();
