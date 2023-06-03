const { JSDOM } = require("jsdom");
const { window } = new JSDOM();
const cheerio = require("cheerio");
const axios = require("axios"); // For making HTTP requests

global.window = window;
global.document = window.document;

// Fetch the HTML content from the URL
axios
  .get("https://www.tiktok.com/@khaby.lame")
  .then((response) => {
    // Load the HTML document into Cheerio
    const $ = cheerio.load(response.data);

    // Scroll the page (if needed)
    // Scroll the page until the scroll position reaches the end
    function scrollPageToBottom() {
      if (
        window.scrollY + window.innerHeight <
        document.documentElement.scrollHeight
      ) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        setTimeout(scrollPageToBottom, 1000); // Wait for a second and scroll again
      }
    }

    scrollPageToBottom();

    // Find all anchor tags within the specified class and extract the href values
    const hrefs = [];
    $(".tiktok-1s72ajp-DivWrapper a").each((index, element) => {
      const href = $(element).attr("href");
      hrefs.push(href);
    });
    console.log(hrefs);
    for (let i = 0; i < hrefs.length; i++) {
      console.log(i + 1);
    }
  })
  .catch((error) => {
    console.log(error);
  });
