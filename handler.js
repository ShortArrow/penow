'use strict';

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const admin = require('firebase-admin');
const serviceAccount = require("./project-sportgym-firebase-adminsdk-mw5eo-c0ebb1d62a.json");
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: ""
});
const db = admin.firestore();
const myCollection = db.collection("days");
const infoCollection = db.collection("info");
const infoDoc = infoCollection.doc("lastupdate");

const target_url = 'https://www.e-shisetsu.e-aichi.jp/sp/';
const freeinfo_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchVacantAction.do?displayNo=papab1000';
const area_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPrpia1000DispAction.do?displayNo=prpaa1000&conditionMode=3';
const nextarea1_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPrpia1000PageMoveAction.do?displayNo=prpia1000&pageControllMode=1';
const nextarea2_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPrpia1000PageMoveAction.do?displayNo=prpia1000&pageControllMode=1';
const togo = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPrpia1000NextAction.do?displayNo=prpia1000&selectedCommunityCd=H1';
const pe_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchInstAction.do?displayNo=prpac1000&selectBldCd=H1200';
const A1_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200013&selectInstLendFlg=1';
const A2_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200014&selectInstLendFlg=1';
const A3_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200015&selectInstLendFlg=1';
const B1_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200016&selectInstLendFlg=1';
const B2_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200017&selectInstLendFlg=1';
const B3_url = 'https://www.e-shisetsu.e-aichi.jp/sp/rsvPTransInstSrchDayWeekAction.do?displayNo=prpad1000&selectInstCd=H1200018&selectInstLendFlg=1';
//9,12,15,18 hour span

module.exports.handler = async (event, context, callback) => {
  let result = null;
  let browser = null;

  const dt = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));//JST
  const firstYear = dt.getFullYear();
  const firstMonth = dt.getMonth() + 1;// Jan = 0, Dec = 11, So plus one.
  const firstDay = dt.getDate();
  let targetYear = firstYear;
  let targetMonth = firstMonth;
  let targetDay = firstDay;
  await infoDoc.set({ date: Number(String(targetYear) + zeroPadding(targetMonth, 2) + zeroPadding(targetDay, 2)) });
  const updateDay = () => {
    dt.setDate(dt.getDate() + 1);
    targetYear = dt.getFullYear();
    targetMonth = dt.getMonth() + 1;// Jan = 0, Dec = 11, So plus one.
    targetDay = dt.getDate();
  }
  myCollection
    .where('id', '<', Number(String(targetYear) + zeroPadding(targetMonth, 2) + zeroPadding(targetDay, 2)))
    .get()
    .then(docs => {
      docs.forEach(doc => {
        doc.ref.delete();
      })
    });

  // collection.doc(props.id).delete();
  // collection.doc(props.id).set({ title: title }, { merge: true });

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    let page_a1 = await browser.newPage();
    let page_a2 = await browser.newPage();
    let page_a3 = await browser.newPage();
    let page_b1 = await browser.newPage();
    let page_b2 = await browser.newPage();
    let page_b3 = await browser.newPage();

    const firstaction = async (page, url_of_area) => {
      await page.goto(event.url || target_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || freeinfo_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || area_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || nextarea1_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || nextarea2_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || togo, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || pe_url, { waitUntil: "domcontentloaded" });
      await page.goto(event.url || url_of_area, { waitUntil: "domcontentloaded" });
      console.log(zeroPadding(firstMonth, 2));
      console.log(zeroPadding(firstDay, 2));
      await page.select('select[name="selectMonth"]', zeroPadding(firstMonth, 2));
      await page.select('select[name="selectDay"]', zeroPadding(firstDay, 2));
      await Promise.all([
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
        page.click('div.ui-submit')
      ]);
      let action_result = await page.evaluate(getReservationAvailability);
      return action_result
    }
    let result_a1, result_a2, result_a3, result_b1, result_b2, result_b3;
    await firstaction(page_a1, A1_url).then((value) => { result_a1 = value[0] });
    await firstaction(page_a2, A2_url).then((value) => { result_a2 = value[0] });
    await firstaction(page_a3, A3_url).then((value) => { result_a3 = value[0] });
    await firstaction(page_b1, B1_url).then((value) => { result_b1 = value[0] });
    await firstaction(page_b2, B2_url).then((value) => { result_b2 = value[0] });
    await firstaction(page_b3, B3_url).then((value) => { result_b3 = value[0] });

    const setDB = async () => {
      let data = {
        id: Number(String(targetYear) + zeroPadding(targetMonth, 2) + zeroPadding(targetDay, 2)),
        h09: {
          A1: result_a1.timespan1,
          A2: result_a2.timespan1,
          A3: result_a3.timespan1,
          B1: result_b1.timespan1,
          B2: result_b2.timespan1,
          B3: result_b3.timespan1,
        },
        h12: {
          A1: result_a1.timespan2,
          A2: result_a2.timespan2,
          A3: result_a3.timespan2,
          B1: result_b1.timespan2,
          B2: result_b2.timespan2,
          B3: result_b3.timespan2,
        },
        h15: {
          A1: result_a1.timespan3,
          A2: result_a2.timespan3,
          A3: result_a3.timespan3,
          B1: result_b1.timespan3,
          B2: result_b2.timespan3,
          B3: result_b3.timespan3,
        },
        h18: {
          A1: result_a1.timespan4,
          A2: result_a2.timespan4,
          A3: result_a3.timespan4,
          B1: result_b1.timespan4,
          B2: result_b2.timespan4,
          B3: result_b3.timespan4,
        }
      }
      await myCollection
        .where('id', '==', Number(String(targetYear) + zeroPadding(targetMonth, 2) + zeroPadding(targetDay, 2)))
        .get()
        .then(docs => {
          docs.forEach(doc => {
            doc.ref.delete();
          })
        });
      await myCollection.add({
        id: data.id,
        h09: data.h09,
        h12: data.h12,
        h15: data.h15,
        h18: data.h18
      });
      updateDay();
    };
    await setDB();

    const getTomorrowPage = async (page) => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
        page.click('a.ui-btn.ui-last-child')
      ]);
      let action_result = await page.evaluate(getReservationAvailability);
      return action_result
    }

    const daysCrawl = async () => {
      await getTomorrowPage(page_a1).then((value) => { result_a1 = value[0] });
      await getTomorrowPage(page_a2).then((value) => { result_a2 = value[0] });
      await getTomorrowPage(page_a3).then((value) => { result_a3 = value[0] });
      await getTomorrowPage(page_b1).then((value) => { result_b1 = value[0] });
      await getTomorrowPage(page_b2).then((value) => { result_b2 = value[0] });
      await getTomorrowPage(page_b3).then((value) => { result_b3 = value[0] });

      await setDB();
    }
    for (let index = 0; index < 90; index++) {
      await daysCrawl();
    }


  } catch (error) {
    return context.fail(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
  return context.succeed("update firestore success");
};

function getReservationAvailability() {
  return [...document.querySelectorAll('.ui-listview.ui-listview-inset.ui-corner-all.ui-shadow:nth-child(2)')].map(article => {
    let timespans = article.querySelectorAll(".ff-monospace");
    const timespan1 = timespans[0].innerHTML;
    const timespan2 = timespans[1].innerHTML;
    const timespan3 = timespans[2].innerHTML;
    const timespan4 = timespans[3].innerHTML;
    return { timespan1, timespan2, timespan3, timespan4 };
  });
}

function zeroPadding(num, length) {
  return ('00000000000' + num).slice(-length);
}

// export default handler;

// module.exports.hello = async (event) => {
//   return {
//     statusCode: 200,
//     body: JSON.stringify(
//       {
//         message: 'Go Serverless v1.0! Your function executed successfully!',
//         input: event,
//       },
//       null,
//       2
//     ),
//   };

//   // Use this code if you don't use the http event with the LAMBDA-PROXY integration
//   // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
// };