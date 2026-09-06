const fs = require('fs');
const https = require('https');
const app = require('./app');
const config = require('./config/env');


const startServer = () => {
  let sslOptions;

  try {
    sslOptions = {
      key: fs.readFileSync(config.ssl.keyPath),
      cert: fs.readFileSync(config.ssl.certPath),
    };
  } catch (err) {
    
    console.error('\n[STARTUP ERROR] Could not find SSL certificate/key.');
    
    console.error(`Expected key at:  ${config.ssl.keyPath}`);
    
    console.error(`Expected cert at: ${config.ssl.certPath}`);
    
    console.error('Run "npm run generate-certs" (or see README) to create a local certificate.\n');
    process.exit(1);
  }

  https.createServer(sslOptions, app).listen(config.port, () => {
    
    console.log(`HustleHub+ API listening securely on https://localhost:${config.port}`);
    
    console.log(`Environment: ${config.nodeEnv}`);
  });
};

startServer();

//Guards against unhandled promise rejections crashing the process silently.
// https://www.geeksforgeeks.org/node-js/node-js-process-unhandledrejection-event/
process.on('unhandledRejection', (err) => {
 
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});
