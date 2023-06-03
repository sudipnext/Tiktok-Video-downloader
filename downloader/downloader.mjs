// Import required modules
import fetch from "node-fetch";
import chalk from "chalk";
import fs from "fs";
import path, { resolve } from "path";
import pkg from 'lodash';
const { reject } = pkg;
import { Headers } from "node-fetch";


// Set user-agent headers to avoid IP bans
const tiktokUserAgent = new Headers();
tiktokUserAgent.append(
  "User-Agent",
  "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet"
);

const chromeUserAgent = new Headers();
chromeUserAgent.append(
  "User-Agent",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
);

// Function to download videos from a list of URLs
const downloadVideos = async (videoList) => {
  const folder = "downloads/";
  videoList.forEach((video) => {
    const fileName = `${video.id}.mp4`;
    const downloadFile = fetch(video.url);
    const file = fs.createWriteStream(folder + fileName);

    downloadFile.then((response) => {
      response.body.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(); // Resolve the promise when the download is complete
      });
      file.on("error", (err) => reject(err)); // Reject the promise if there is an error during download
    });
  });
};

// Function to get a TikTok video URL without watermark
const getVideoWithoutWatermark = async (url) => {
  const videoId = await extractVideoId(url); // Extract the video ID from the given URL
  const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
  const request = await fetch(apiUrl, {
    method: "GET",
    headers: tiktokUserAgent,
  });
  const responseText = await request.text();

  try {
    var responseData = JSON.parse(responseText);
  } catch (error) {
    console.error("Error:", error);
    console.error("Response body:", responseText);
  }

  const videoUrl = responseData.aweme_list[0].video.play_addr.url_list[0];
  const videoData = {
    url: videoUrl,
    id: videoId,
  };
  return videoData;
};

// Function to extract the video ID from a TikTok URL
const extractVideoId = (url) => {
  const videoId = url.substring(url.lastIndexOf("/") + 1);
  return videoId;
};

// Main function (entry point)
(async () => {
  var videoUrls = [
    'https://www.tiktok.com/@khaby.lame/video/7239913302556560667',
    'https://www.tiktok.com/@khaby.lame/video/7239007603148344603',
    'https://www.tiktok.com/@khaby.lame/video/7237507826342563098',
    'https://www.tiktok.com/@khaby.lame/video/7237136777348238618',
    'https://www.tiktok.com/@khaby.lame/video/7236412257670925594',
    'https://www.tiktok.com/@khaby.lame/video/7234938483079531802',
    'https://www.tiktok.com/@khaby.lame/video/7234540189316697371',
    'https://www.tiktok.com/@khaby.lame/video/7234174319138491674',
    'https://www.tiktok.com/@khaby.lame/video/7233797305286036762',
    'https://www.tiktok.com/@khaby.lame/video/7233423347177032987',
    'https://www.tiktok.com/@khaby.lame/video/7232610702618414362',
    'https://www.tiktok.com/@khaby.lame/video/7231974500999400731',
    'https://www.tiktok.com/@khaby.lame/video/7231186203003948314',
    'https://www.tiktok.com/@khaby.lame/video/7230088385799408923',
    'https://www.tiktok.com/@khaby.lame/video/7229785946785402139',
    'https://www.tiktok.com/@khaby.lame/video/7229396632150822170'
  ] // List of video URLs to download
  var videoDataList = []; // List to store video data

  // Example URL to download a TikTok video
  // const tiktokUrl = "https://www.tiktok.com/@khaby.lame/video/7239913302556560667";
  // videoUrls.push(tiktokUrl);

  console.log(chalk.green(`[!] Found ${videoUrls.length} video`));

  for (var i = 0; i < videoUrls.length; i++) {
    console.log(
      chalk.green(`[*] Downloading video ${i + 1} of ${videoUrls.length}`)
    );
    console.log(chalk.green(`[*] URL: ${videoUrls[i]}`));
    var videoData = await getVideoWithoutWatermark(videoUrls[i]);

    videoDataList.push(videoData);
  }

  // Download the videos
  downloadVideos(videoDataList)
    .then(() => {
      console.log(chalk.green("[+] Download completed successfully"));
    })
    .catch((error) => {
      console.log(chalk.red("[X] Error: " + error));
    });
})();
