// Quick test script to verify Groq API key works
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testGroqAPI() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.error('❌ GROQ_API_KEY not set in .env file');
    console.log('\n📝 Steps to fix:');
    console.log('1. Go to https://console.groq.com');
    console.log('2. Sign up for a free account');
    console.log('3. Create an API key');
    console.log('4. Add it to server/.env file as: GROQ_API_KEY=gsk_...');
    process.exit(1);
  }

  console.log('🔍 Testing Groq API connection...');
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    // Test with a simple API call to check if key is valid
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Groq API key is valid!');
      console.log(`📊 Available models: ${data.data?.length || 0}`);
      
      // Check if whisper model is available
      const whisperModel = data.data?.find(m => m.id.includes('whisper'));
      if (whisperModel) {
        console.log(`🎤 Whisper model found: ${whisperModel.id}`);
      }
      
      console.log('\n✨ Your setup is ready! Run "npm run dev" to start the server.');
    } else {
      const errorText = await response.text();
      console.error('❌ API key is invalid or expired');
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${errorText}`);
      console.log('\n📝 Get a new API key from https://console.groq.com');
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\n🌐 Check your internet connection');
  }
}

testGroqAPI();
