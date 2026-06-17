const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream("c:/Users/surface/Desktop/StudyPilot/sample.pdf");
https.get("https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf", function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("PDF downloaded successfully");
  });
}).on('error', (err) => {
  console.error("Error downloading PDF:", err.message);
});
