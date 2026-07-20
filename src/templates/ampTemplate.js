const ampTemplate = (trackingId, subject, campaignName, campaignType) => {
  const baseUrl = process.env.API_URL; 

  return `<!DOCTYPE html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <style amp4email-boilerplate>body{visibility:hidden}</style>
  <style amp-custom>
    @media only screen and (min-width:480px){.mj-column-per-100{width:100%;max-width:100%}}
    .moz-text-html .mj-column-per-100{width:100%;max-width:100%}
    @media only screen and (max-width:480px){table.mj-full-width-mobile{width:100%}td.mj-full-width-mobile{width:auto}td.mj-full-width-mobile img{width:100%}}
    .body-wrapper.disable-heading-font-weight h1,.body-wrapper.disable-heading-font-weight h2,.body-wrapper.disable-heading-font-weight h3,.body-wrapper.disable-heading-font-weight h4,.body-wrapper.disable-heading-font-weight h5,.body-wrapper.disable-heading-font-weight h6{font-weight:400}
    @media only screen and (min-width:480px){.body-wrapper{padding-top:12px}}
    div p{margin:0 0}
    h1,h2,h3,h4,h5,h6{margin:0}
    h1{font-size:28px}
    h2{font-size:24px}
    h3{font-size:20px}
    h4{font-size:18px}
    p{font-size:16px}
    a{text-decoration:none}
    ol,ul{margin-top:0;margin-bottom:0}
    .freeze-block-img img,.html-freeze-block-img img,.custom-block-img img,.html-custom-block-img img{object-fit:cover}
    .navbar-mj>.mj-inline-links>table{display:inline-block}
    .formjh3103-wrapper .input-style{color:#000;background-color:transparent;font-family:Helvetica;font-size:12px;width:100%;border:1px solid #191919;border-radius:12px;padding:6px 12px;line-height:1.5;display:block;margin:0 auto}
    @media screen and (max-width:500px){.formjh3103-wrapper .input-style{width:100%;padding:6px 12px}}
    .formjh3103-wrapper .phone-input-wrapper{display:flex;justify-content:center}
    .formjh3103-wrapper .input-style{-webkit-appearance:none;appearance:none}
    .formjh3103-wrapper .answer{position:relative}
    .formjh3103-wrapper .select-box .select-box__arrow{font-family:monospace;position:absolute;height:16px;top:calc(50% - 8px);right:10px;transform:rotate(180deg);font-size:14px}
    .formjh3103-wrapper .two-fields-input{display:flex;flex-direction:row;gap:12px;width:100%}
    .flex-1{flex:1;position:relative}
    .formjh3103-wrapper .textarea-style{height:100px;display:block;margin:0 auto;width:100%}
    .formjh3103-wrapper .option-container,.formjh3103-wrapper .image-option-container{text-align:center}
    .formjh3103-wrapper .consent-checkbox-label{justify-content:center;text-align:center;display:flex}
    .formjh3103-wrapper .chip-option-container{justify-content:center;display:flex;flex-wrap:wrap}
    .formjh3103-wrapper .select-container{display:inline-flex;align-items:center;position:relative;margin:5px 0 5px 10px;cursor:pointer;font-size:12px;color:#000}
    .formjh3103-wrapper .chip-select-container,.formjh3103-wrapper .image-select-container{display:flex;flex-wrap:wrap;position:relative;margin:5px 0 5px 10px;cursor:pointer;font-size:12px;color:#000}
    .formjh3103-wrapper .image-select-container{margin:0;height:100%}
    .formjh3103-wrapper .select-container input,.formjh3103-wrapper .chip-select-container input,.formjh3103-wrapper .image-select-container input{display:none}
    .formjh3103-wrapper .checkmark{height:25px;width:25px;margin-right:10px;background-color:#ccc;transform:scale(.8);flex-shrink:0}
    .formjh3103-wrapper .chip-checkmark{margin-right:10px;background-color:#ccc;color:#000;padding:8px 21px;border-radius:24px;line-height:normal}
    .formjh3103-wrapper .select-container:hover input~.checkmark{box-shadow:0 0 0 2px #7367f0}
    .formjh3103-wrapper .image-select-container input~.image-question{border:2px solid #ccc;padding:2px;width:100%}
    .formjh3103-wrapper .image-select-container input~.image-question img{display:block;object-fit:cover}
    .formjh3103-wrapper .image-select-container input:checked~.image-question{border-color:#7367f0}
    .formjh3103-wrapper .select-container input:checked~.checkmark{background-color:#7367f0}
    .formjh3103-wrapper .chip-select-container input:checked~.chip-checkmark{background-color:#7367f0;color:#fff}
    .formjh3103-wrapper .checkmark-check{position:relative}
    .formjh3103-wrapper .select-container input:checked~.checkmark{position:absolute;left:9px;top:5px;width:5px;height:10px;border:solid #fff;border-width:0 3px 3px 0;transform:rotate(45deg);display:block}
    .formjh3103-wrapper .checkmark-radio{border-radius:50%}
    .formjh3103-wrapper .nps-wrapper,.rating-wrapper{display:flex;flex-wrap:wrap}
    .formjh3103-wrapper .rating-wrapper.five-star{justify-content:center}
    .formjh3103-wrapper .nps-wrapper label{color:#0f172a;position:relative;margin:0;border:1px solid #d3d3d3;border-radius:6.4px;width:35px;height:35px}
    .formjh3103-wrapper .nps-wrapper label input{width:100%;height:100%;opacity:0;position:absolute;margin:0;cursor:pointer}
    .formjh3103-wrapper .nps-wrapper label span{cursor:pointer;white-space:nowrap;position:absolute;height:calc(100% - 4px);width:calc(100% - 4px);display:flex;justify-content:center;align-items:center;font-size:14px;border-radius:0.4rem;background-color:#ccc;border:1px solid #cbd5e1}
    .formjh3103-wrapper .nps-wrapper label input:checked~span{background-color:#7367f0;color:#fff;border:2px solid #7367f0}
    .formjh3103-wrapper .question{padding:12px 0 0 0;font-size:12px;line-height:1.2;color:#000;background-color:transparent;font-family:Helvetica;text-align:left}
    @media screen and (max-width:500px){.formjh3103-wrapper .question{text-align:center}}
    .formjh3103-wrapper .button{margin:0;padding:14px 16px;border:none;border-radius:600px;background-color:#178218;color:#fff;font-size:16px;line-height:1;cursor:pointer;display:block;margin:0 auto}
    .formjh3103-wrapper .overall{background-color:transparent;width:100%;border:3px solid #652394;border-radius:10px;font-family:Helvetica;padding:24px 32px;color:#000;margin:0 auto;box-sizing:border-box}
    .button-elementaoshh6{background-color:#178218;color:#fff;border-radius:600px;padding:10px 16px;margin:20px 10px 20px 0;font-size:16px;font-family:Helvetica;border:none;cursor:pointer}
    .hide-on-desktop{display:none}
    @media screen and (max-width:480px){.hide-on-desktop{display:block}.hide-on-mobile{display:none}}
  </style>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-element="amp-bind" src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"></script>
  <script custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js" async></script>
</head>
<body style="word-spacing:normal;background-color:#f8fafc">
  <div class="body-wrapper disable-heading-font-weight">
    <div style="background:#fff;margin:0 auto;width:100%;max-width:none">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#fff">
        <tbody>
          <tr>
            <td style="padding:0;text-align:center">
              <div class="mj-column-per-100" style="font-size:0;text-align:left;display:inline-block;vertical-align:top;width:100%">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="padding:0">
                        <a href="https://tn.btrkr.com/clicks/amp/..." target="_blank">
                          <amp-img alt="Image" src="https://img.mmdocdn.com/mailmodo/image/upload/ar_946:1600,c_crop/v1756704504/editor/p/62dc8626-eafe-4c68-a935-861517fb9628/b20f300699305eadf65f9988cb020bb2_cd9fdw.jpg" width="600" height="850" layout="responsive"></amp-img>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="formjh3103-wrapper" style="padding:20px">
                <amp-state id="formjh3103">
                  <script type="application/json">
                    {
                      "currentStep": "stepk1jrs1",
                      "responses": {"stepk1jrs1": {}}
                    }
                  </script>
                </amp-state>

                <form id="form_formjh3103_stepk1jrs1" method="post" action-xhr="${baseUrl}/track/form-amp/${trackingId}">
                  <div class="overall" [hidden]="formjh3103.currentStep != 'stepk1jrs1'">
                    <h2><span style="color:#652394"><strong>Check Your Eligibility</strong></span></h2>

                    <div class="element-wrapper">
                      <div class="question"><p><strong>Company Name</strong>*</p></div>
                      <input class="input-style" required type="text" name="company" placeholder="Enter Company Name">
                    </div>

                    <div class="element-wrapper" style="margin-top:15px">
                      <div class="question"><p><strong>Mobile No</strong>*</p></div>
                      <input class="input-style" required type="tel" name="mobile" placeholder="Enter Mobile No">
                    </div>

                    <input type="hidden" name="trackingid" value="${trackingId}">
                    <input type="hidden" name="subject" value="${subject}">
                    <input type="hidden" name="campaignName" value="${campaignName}">
                    <input type="hidden" name="campaignType" value="${campaignType}">

                    <button class="button" type="submit" style="margin-top:20px">
                      <strong>Apply Now</strong>
                    </button>
                  </div>

                  <div submit-success>
                    <template type="amp-mustache">
                      <div class="overall">
                        <p style="text-align:center; color:#652394"><strong>Thank you for submitting!</strong></p>
                      </div>
                    </template>
                  </div>
                  <div submit-error>
                    <template type="amp-mustache">
                      <div class="overall"><p>Submission failed. Please try again.</p></div>
                    </template>
                  </div>
                </form>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <table width="100%" align="center" style="margin-top: 12px;">
    <tr>
      <td align="center">
        <a style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px;" href="${baseUrl}/track/unsubscribe/${trackingId}">Unsubscribe</a>
      </td>
    </tr>
  </table>
  <amp-img src="${baseUrl}/track/open-amp/${trackingId}?campaignName=${encodeURIComponent(campaignName)}&campaignType=${encodeURIComponent(campaignType)}&subject=${encodeURIComponent(subject)}" 
             width="1" 
             height="1" 
             layout="fixed"
             alt=""></amp-img>
</body>
</html>
`;
};

export default ampTemplate;
