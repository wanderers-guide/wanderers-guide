export async function getIcon(content: string) {
  const res = await fetch(`https://api.dicebear.com/7.x/shapes/svg?seed=${content}`);
  return res.ok ? await res.text() : '';
}

export async function isValidImage(url: string): Promise<boolean> {
  const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}(\S*)$/;
  if (url.match(urlPattern)) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = function () {
        resolve(true);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = url;
    });
  } else {
    return false;
  }
}
