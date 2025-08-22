import React, { useState } from 'react';

function formatSize(bytes) {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + ' ' + sizes[i];
}

export default function FileDownloadWithProgress({ url, fileName, fileSize }) {
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setProgress(0);
    const response = await fetch(url);
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || fileSize || 1;
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      setProgress(Math.round((received * 100) / contentLength));
    }
    const blob = new Blob(chunks);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'file';
    link.click();
    setProgress(0);
  };

  return (
    <div>
      <button onClick={handleDownload} className="text-blue-600 underline">{fileName || 'file'}</button>
      {fileSize ? <span className="text-xs text-gray-500 ml-1">({formatSize(fileSize)})</span> : null}
      {progress > 0 && progress < 100 && (
        <div className="w-28 h-2 bg-gray-200 rounded mt-1">
          <div className="h-2 bg-green-500 rounded" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );

}