const ampWebTemplate = (trackingId, subject, campaignName, campaignType) => {

  const baseUrl = process.env.API_URL;

  return `
<!doctype html>
<html amp>

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,minimum-scale=1,initial-scale=1"
  >

  <script
    async
    src="https://cdn.ampproject.org/v0.js"
  ></script>

  <script
    async
    custom-element="amp-form"
    src="https://cdn.ampproject.org/v0/amp-form-0.1.js"
  ></script>

  <script
    async
    custom-element="amp-bind"
    src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"
  ></script>

  <script
    async
    custom-template="amp-mustache"
    src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"
  ></script>

  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>

  <style amp-custom>

    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }

    body{
      margin:0;
      background:#f8fafc;
      font-family:Arial,sans-serif;
      padding:20px;
    }

    .container{
      width:100%;
      max-width:840px;
      margin:auto;
      background:#ffffff;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 4px 15px rgba(0,0,0,0.1);
    }

    .banner-wrapper{
      width:100%;
      max-width:720px;
      margin:0 auto;
    }

    .form-wrapper{
      padding:24px;
    }

    .overall{
      border:3px solid #652394;
      border-radius:12px;
      padding:24px;
    }

    h2{
      color:#652394;
      text-align:center;
      margin-bottom:24px;
    }

    .field{
      margin-bottom:18px;
    }

    .question{
      font-size:14px;
      margin-bottom:8px;
      font-weight:600;
      color:#111827;
    }

    .input-style{
      width:100%;
      padding:14px;
      border:1px solid #d1d5db;
      border-radius:10px;
      font-size:15px;
      box-sizing:border-box;
    }

    .button{
      width:100%;
      padding:14px;
      border:none;
      border-radius:999px;
      background:#178218;
      color:#fff;
      font-size:16px;
      cursor:pointer;
    }

    .success{
      color:#178218;
      text-align:center;
      font-weight:bold;
      padding:20px 0;
    }

    .error{
      color:red;
      text-align:center;
      font-weight:bold;
      padding:20px 0;
    }

    .footer{
      text-align:center;
      margin-top:20px;
    }

    .footer a{
      color:grey;
      font-size:12px;
    }

    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      .container {
        border-radius: 8px;
      }
      .form-wrapper {
        padding: 16px;
      }
      .overall {
        padding: 16px;
        border-width: 2px;
      }
      h2 {
        font-size: 20px;
        margin-bottom: 16px;
      }
      .input-style {
        padding: 12px;
        font-size: 14px;
      }
      .button {
        padding: 12px;
        font-size: 15px;
      }
    }

  </style>

</head>

<body>

  <div class="container">

    <div class="banner-wrapper">
      <amp-img
        src="https://img.mmdocdn.com/mailmodo/image/upload/ar_946:1600,c_crop/v1756704504/editor/p/62dc8626-eafe-4c68-a935-861517fb9628/b20f300699305eadf65f9988cb020bb2_cd9fdw.jpg"
        width="720"
        height="1020"
        layout="responsive"
        alt="Banner"
      >
      </amp-img>
    </div>

    <div class="form-wrapper">

    <amp-state id="formjh3103">
    <script type="application/json">
    {
      "currentStep": "stepk1jrs1"
    }
    </script>
    </amp-state>

      <form
         method="post"
         action-xhr="${baseUrl}/track/form-html/${trackingId}"
         target="_top"
         enctype="application/x-www-form-urlencoded"
         [hidden]="formjh3103.currentStep == 'thankyou'"
         on="submit-success:AMP.setState({
         formjh3103: {
         currentStep: 'thankyou'
         }
     })"
      >

        <div class="overall" [hidden]="formjh3103.currentStep != 'stepk1jrs1'" >

          <h2>
            Check Your Eligibility
          </h2>

          <div class="field">

            <div class="question">
              Company Name *
            </div>

            <input
              class="input-style"
              type="text"
              name="company"
              placeholder="Enter Company Name"
              required
            >

          </div>

          <div class="field">

            <div class="question">
              Mobile No *
            </div>

            <input
              class="input-style"
              type="tel"
              name="mobile"
              placeholder="Enter Mobile No"
              required
            >

          </div>

          <input
            type="hidden"
            name="trackingid"
            value="${trackingId}"
          >
          <input type="hidden" name="subject" value="${subject}">
          <input type="hidden" name="campaignName" value="${campaignName}">
          <input type="hidden" name="campaignType" value="${campaignType}">


          <button
            class="button"
            type="submit"
          >
            Apply Now
          </button>

        </div>


        <div submit-error>

          <template type="amp-mustache">

            <div class="error">
              Submission failed.
            </div>

          </template>

        </div>

      </form>

      <div
       class="overall" hidden [hidden]="formjh3103.currentStep != 'thankyou'" >

        <h2 style="text-align:center;color:#178218">
          Thank You!
        </h2>

        <p style="text-align:center;margin-top:10px">
           Your form has been submitted successfully.
        </p>

      </div>

    </div>

  </div>

</body>
</html>
`;
};

export default ampWebTemplate;
