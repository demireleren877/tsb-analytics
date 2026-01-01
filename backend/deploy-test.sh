#!/bin/bash
echo "🚀 Deploy başlatılıyor..."
npm run deploy
echo ""
echo "✅ Deploy tamamlandı! Test için:"
echo "curl -k -s 'https://tsb-analytics-api.l5819033.workers.dev/api/test-import/20253' | python3 -m json.tool"
