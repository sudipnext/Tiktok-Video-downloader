import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import fetch from "node-fetch";
import chalk from "chalk";
import Signer from "tiktok-signature";
import fs from "fs";
import { Headers } from "node-fetch";
import path, { resolve } from "path";
import pkg from "lodash";
const { reject } = pkg;

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.get("/download/:username", async (req, res) => {
  const username = req.params.username;
  console.log(req.params.username);

  try {
    const TT_REQ_PERM_URL =
      "https://www.tiktok.com/api/post/item_list/?aid=1988&app_language=en&app_name=tiktok_web&battery_info=1&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20%28Windows%20NT%2010.0%3B%20Win64%3B%20x64%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F107.0.0.0%20Safari%2F537.36%20Edg%2F107.0.1418.56&channel=tiktok_web&cookie_enabled=true&device_id=7165118680723998214&device_platform=web_pc&focus_state=true&from_page=user&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=RO&referer=&region=RO&screen_height=1440&screen_width=2560&tz_name=Europe%2FBucharest&webcast_language=en&msToken=G3C-3f8JVeDj9OTvvxfaJ_NppXWzVflwP1dOclpUOmAv4WmejB8kFwndJufXBBrXbeWNqzJgL8iF5zn33da-ZlDihRoWRjh_TDSuAgqSGAu1-4u2YlvCATAM2jl2J1dwNPf0_fk9dx1gJxQ21S0=&X-Bogus=DFSzswVYxTUANS/JS8OTqsXyYJUo&_signature=_02B4Z6wo00001CoOkNwAAIDBCa--cQz5e0wqDpRAAGoE8f";
    const url = `https://www.tiktok.com/${username}`;

    //A function used to scrape the secUid which is necessary to put into the url to get all the videos
    async function getAuthorSecId() {
      try {
        const response = await axios.get(url);
        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);
        const scriptElement = $("script#SIGI_STATE");

        if (scriptElement.length > 0) {
          const jsonContent = scriptElement.html().trim();
          const parsedData = JSON.parse(jsonContent);

          // Access the authorSecId
          const authorSecId = parsedData.UserPage.secUid;

          if (authorSecId) {
            return authorSecId;
          } else {
            throw new Error("Unable to find authorSecId in the JSON data.");
          }
        } else {
          throw new Error("Unable to find the JSON data in the HTML source.");
        }
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    }
    let SEC_UID;
    getAuthorSecId()
      .then((authorSecId) => {
        SEC_UID = authorSecId;
        console.log("authorSecId:", SEC_UID);

        // Code that depends on SEC_UID
        runCodeWithSecUid();
      })
      .catch((error) => console.error("Error:", error));
    let vidUrls = [];
    //Defining a async function to run only when we get the SEcUID i.e after resolving it
    async function runCodeWithSecUid() {
      // We use Apple, based on the issue comments in the repo, this helps prevent TikTok's captcha from triggering
      const TT_REQ_USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56";

      const PARAMS = {
        aid: "1988",
        count: 35,
        secUid: SEC_UID,
        cursor: 0,
        cookie_enabled: true,
        screen_width: 0,
        screen_height: 0,
        browser_language: "",
        browser_platform: "",
        browser_name: "",
        browser_version: "",
        browser_online: "",
        timezone_name: "Europe/London",
      };

      const signer = new Signer(null, TT_REQ_USER_AGENT);
      await signer.init();

      const qsObject = new URLSearchParams(PARAMS);
      const qs = qsObject.toString();

      const unsignedUrl = `https://m.tiktok.com/api/post/item_list/?${qs}`;
      const signature = await signer.sign(unsignedUrl);
      const navigator = await signer.navigator();
      await signer.close();

      const { "x-tt-params": xTtParams } = signature;
      const { user_agent: userAgent } = navigator;

      const res = await testApiReq({ userAgent, xTtParams });
      const { data } = res;
      for (const item of data["itemList"]) {
        const id = item.id;
        vidUrls.push(`${url}/video/${id}`);
      }
      //logging out to check the vidUrls
      runAftervidUrls_fetched();
    }

    async function testApiReq({ userAgent, xTtParams }) {
      const options = {
        method: "GET",
        headers: {
          "user-agent": userAgent,
          "x-tt-params": xTtParams,
        },
        url: TT_REQ_PERM_URL,
      };
      return axios(options);
    }
    //downloading the files
    async function runAftervidUrls_fetched() {
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
      const downloadVideos = async (videoList) => {
        const folder = "public/downloads/";
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
        var videoUrls = vidUrls; // List of video URLs to download
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
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred during download");
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
