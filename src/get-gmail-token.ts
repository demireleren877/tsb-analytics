import { google } from 'googleapis';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔐 Gmail OAuth2 Token Alma\n');
  console.log('1. Aşağıdaki URL\'yi tarayıcınızda açın:\n');
  console.log(authUrl);
  console.log('\n2. Google hesabınızla giriş yapın ve izin verin');
  console.log('3. Yönlendirildikten sonra adres çubuğundaki "code" parametresini kopyalayın\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Authorization code\'u buraya yapıştırın: ', async (code) => {
    rl.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n✅ Token alındı!\n');
      console.log('Aşağıdaki bilgileri .env dosyanıza ekleyin:\n');
      console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\nToken bilgisi:');
      console.log(JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('❌ Token alma hatası:', error);
    }
  });
}

getToken();
