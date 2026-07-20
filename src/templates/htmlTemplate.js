
const htmlTemplate = (trackingId, subject, campaignName, campaignType) => {
  const baseUrl = process.env.API_URL;

  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <title>mailer</title>
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=3Dedge">
    <!--<![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=3Ddevice-width,initial-scale=3D1">
    <style type="text/css">
        #outlook a{padding:0}body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}img{border:0;height:auto;line-height:100%;outline:0;text-decoration:none;-ms-interpolation-mode:bicubic}p{display:block;margin:13px 0}
    </style>
    <!--[if mso]>    <noscript>    <xml>    <o:OfficeDocumentSettings>      <o:AllowPNG/>      <o:PixelsPerInch>96</o:PixelsPerInch>    </o:OfficeDocumentSettings>    </xml>    </noscript>    <![endif]-->
    <!--[if lte mso 11]>    <style type="text/css">      .mj-outlook-group-fix { width:100% !important; }    </style>    <![endif]-->
    <style type="text/css">
        @media only screen and (min-width:480px){.mj-column-per-100{width:100%!important;max-width:100%}}
    </style>
    <style media="screen and (min-width:480px)">
        .moz-text-html .mj-column-per-100{width:100%!important;max-width:100%}
    </style>
    <style type="text/css">
        @media only screen and (max-width:479px){table.mj-full-width-mobile{width:100%!important}td.mj-full-width-mobile{width:auto!important}td.mj-full-width-mobile img{width:100%!important}td.mj-full-width-mobile img.width-mobile-94{width:94%!important}td.mj-full-width-mobile img.width-mobile-95{width:95%!important}td.mj-full-width-mobile img.width-mobile-96{width:96%!important}td.mj-full-width-mobile img.width-mobile-98{width:98%!important}}
    </style>
    <style type="text/css">
        .body-wrapper.disable-heading-font-weight h1,
.body-wrapper.disable-heading-font-weight h2,
.body-wrapper.disable-heading-font-weight h3,
.body-wrapper.disable-heading-font-weight h4,
.body-wrapper.disable-heading-font-weight h5,
.body-wrapper.disable-heading-font-weight h6 {
  font-weight: 400;
}
div p {
  margin: 0 0;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
}
h1 {
  font-size: 28px;
}
h2 {
  font-size: 24px;
}
h3 {
  font-size: 20px;
}
h4 {
  font-size: 18px;
}
p {
  font-size: 16px;
}
a {
  text-decoration: none;
}
ol,
ul {
  margin-top: 0;
  margin-bottom: 0;
}
.freeze-block-img img {
  object-fit: cover;
}
.html-freeze-block-img img {
  object-fit: cover;
}
.custom-block-img img {
  object-fit: cover;
}
.html-custom-block-img img {
  object-fit: cover;
}
.navbar-mj > .mj-inline-links > table {
  display: inline-block;
}
body {
  padding: 0;
}
figure.table {
  margin: 0;
}
figure.table table {
  width: 100%;
}
figure.table table td,
figure.table table th {
  min-width: 2em;
  padding: 0.4em;
  border: 1px solid #bfbfbf;
}
.amp-html-block .brand-library-widget h1,
.bl-typography-block-wrapper h1,
.brand-library-widget h1 {
  font-size: 26px;
  color: #000;
}
.amp-html-block .brand-library-widget h2,
.bl-typography-block-wrapper h2,
.brand-library-widget h2 {
  font-size: 22px;
  color: #000;
}
.amp-html-block .brand-library-widget h3,
.bl-typography-block-wrapper h3,
.brand-library-widget h3 {
  font-size: 18px;
  color: #000;
}
.amp-html-block .brand-library-widget h4,
.bl-typography-block-wrapper h4,
.brand-library-widget h4 {
  font-size: 16px;
  color: #000;
}
.amp-html-block .brand-library-widget p,
.amp-html-block .brand-library-widget.checkbox-option,
.amp-html-block .brand-library-widget.radio-option,
.bl-typography-block-wrapper ol li,
.bl-typography-block-wrapper p,
.bl-typography-block-wrapper ul li,
.brand-library-widget ol li,
.brand-library-widget p,
.brand-library-widget ul li {
  font-size: 12px !important;
  color: #000;
}
.form-text h1,
.form-text h2,
.form-text h3,
.form-text h4,
.form-text p {
  color: revert;
  font-size: revert;
  font-family: inherit;
}
.question h1,
.question h2,
.question h3,
.question h4,
.question p {
  color: revert;
  font-size: revert;
  font-family: inherit;
}
.navigation-button-wrapper p {
  color: revert;
  font-size: revert;
  font-family: inherit;
}
.amp-html-block p {
  font-size: inherit;
  color: revert;
}
.amp-btn-wrapper p {
  font-size: inherit;
  color: revert;
}
.hide-on-desktop {
  display: none;
  mso-hide: all;
}
.hide-on-desktop,
.sf-hide-on-desktop {
  mso-hide: all;
  display: none;
}
.hide-on-desktop div,
.hide-on-desktop p,
.hide-on-desktop table,
.hide-on-desktop tbody,
.hide-on-desktop td,
.hide-on-desktop tr {
  mso-hide: all;
  display: none;
}

    </style>
    <style type="text/css">
        @media only screen and (min-width:480px){.body-wrapper{padding-top:0}}
    </style>
    <style type="text/css">
        @media screen and (min-width:280px) and (max-width:299px){.ratio-20,.ratio-25,.ratio-33{width:45%!important}.ratio-66,.ratio-75,.ratio-80{width:45%!important}}
    </style>
    <style type="text/css">
        @media screen and (min-width:300px) and (max-width:359px){.ratio-20,.ratio-25,.ratio-33{width:40%!important}.ratio-66,.ratio-75,.ratio-80{width:60%!important}}
    </style>
    <style type="text/css">
        @media screen and (min-width:360px) and (max-width:459px){.ratio-20,.ratio-25{width:33%!important}.ratio-75,.ratio-80{width:66%!important}}
    </style>
    <style type="text/css">
        @media screen and (min-width:460px) and (max-width:560px){.ratio-20{width:25%!important}.ratio-80{width:75%!important}}
    </style>
    <style type="text/css">
        @media screen and (max-width:480px){.mj-sa-column-per-10{width:15%}.mj-sa-column-per-70{width:65%}}
    </style>
    <style type="text/css">
        @media only screen and (max-width:480px){table.mj-full-width-mobile{width:100%!important}td.mj-full-width-mobile{width:auto!important}.html-freeze-block-img .mj-full-width-mobile img{height:auto!important}.html-custom-block-img .mj-full-width-mobile img{height:auto!important}}
    </style>
    <style type="text/css">
        @media only screen and (min-width:480px){.mj-column-per-100{width:100%!important;max-width:100%}.mj-column-per-10{width:10%!important;max-width:10%}.mj-column-per-65{width:65%!important;max-width:65%}.mj-column-per-34{width:34%!important;max-width:34%!important}.mj-column-per-66{width:66%!important;max-width:66%!important}.mj-column-per-25{width:25%!important;max-width:25%}.mj-column-per-100{width:100%;max-width:100%}.mj-column-per-33-33{width:33.33%;max-width:33.33%}.mj-column-per-33-34{width:33.34%;max-width:33.34%}}
    </style>
    <style type="text/css">
        @media (max-width:480px){.amp-html-block .brand-library-widget h1,.bl-typography-block-wrapper h1{font-size:26px}.amp-html-block .brand-library-widget h2,.bl-typography-block-wrapper h2{font-size:22px}.amp-html-block .brand-library-widget h3,.bl-typography-block-wrapper h3{font-size:18px}.amp-html-block .brand-library-widget h4,.bl-typography-block-wrapper h4{font-size:16px}.amp-html-block .brand-library-widget ol li,.amp-html-block .brand-library-widget p,.amp-html-block .brand-library-widget ul li,.bl-typography-block-wrapper ol li,.bl-typography-block-wrapper p,.bl-typography-block-wrapper ul li{font-size:14px!important}.brand-library-widget p{font-size:14px!important}.amp-btn-wrapper p{font-size:inherit}}
    </style>
    <style type="text/css">
        @media screen and (max-width:480px){.hide-on-desktop,.sf-hide-on-desktop{display:revert}.hide-on-mobile,.sf-hide-on-mobile{display:none}}
    </style>
    <style type="text/css">
        @media only screen and (max-width:480px){.hide-on-desktop,.sf-hide-on-desktop{display:revert}.hide-on-desktop div,.hide-on-desktop p,.hide-on-desktop table,.hide-on-desktop tbody,.hide-on-desktop td,.hide-on-desktop tr{display:revert}.hide-on-mobile,.sf-hide-on-mobile{display:none;mso-hide:all;font-size:0;max-height:0}.hide-on-mobile div,.hide-on-mobile p,.hide-on-mobile table,.hide-on-mobile tbody,.hide-on-mobile td,.hide-on-mobile tr{display:none;mso-hide:all;font-size:0;max-height:0}}
    </style>
</head>

<body style="word-spacing:normal;background-color:#f8fafc">
    <div style="color:transparent;visibility:hidden;opacity:0;font-size:0px;border:0;max-height:1px;width:1px;margin:0px;padding:0px;border-width:0px!important;display:none!important;line-height:0px!important;"><img border="0" width="1" height="1" src="https://sp-t1.mmtrkr.com/q/XQqCKr-7SVE0MmhcWEmk-w~~/AASgtxA~/uIdWoNtyX4hHbRlTHqmqobz9EYT4_zGc1yywJBzu4qq-O20krsGkmhqaS-AHDzDwACvwSbeov_Tc_NZbcgd-JQ~~" alt="" /></div><span style="display:none">GROWTH, GUIDANCE &amp; PROMISE to the Indian Business Ecosystem</span>
    <div
    class="body-wrapper disable-heading-font-weight" style="background-color:#f8fafc">
        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:100%;" width="100%" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#fff;background-color:#fff;margin:0 auto;border-radius:0;width:100%;max-width:none">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;background-color:#fff;width:100%;border-radius:0">
                <tbody>
                    <tr>
                        <td style="border:0 solid transparent;direction:ltr;font-size:0;padding:0;padding-bottom:0;padding-left:0;padding-right:0;padding-top:0;text-align:center">
                            <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="bl-typography-block-wrapper-outlook -outlook bg-blocku4q3y1-outlook" width="100%" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="bl-typography-block-wrapper-outlook -outlook bg-blocku4q3y1-outlook" role="presentation" style="width:100%;" width="100%" bgcolor="transparent" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
                            <div class="bl-typography-block-wrapper bg-blocku4q3y1" style="background:0 0;background-color:transparent;margin:0 auto;border-radius:0;width:100%;max-width:none">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:0 0;background-color:transparent;width:100%;border-radius:0">
                                    <tbody>
                                        <tr>
                                            <td style="border:0 solid transparent;direction:ltr;font-size:0;padding:20px 0;padding-bottom:0;padding-left:0;padding-right:0;padding-top:0;text-align:center">
                                                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:100%;" ><![endif]-->
                                                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                                        <tbody>
                                                            <tr>
                                                                <td style="background-color:transparent;border:0 solid transparent;border-radius:0;vertical-align:top;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td align="center" class="html-custom-block-img" style="font-size:0;padding:0;word-break:break-word">
                                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0" class="mj-full-width-mobile">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td style="width:100%" class="mj-full-width-mobile">
                                                                                                    <a href="https://tn.btrkr.com/clicks/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b/88ac0eef-9649-5e2a-b67a-634c87a9c88e?urlChildId=3Db60acc15-b246-5f88-b38f-c7ece71b9896&templateId=3D5e0488ba-5f90-4794-8b11-43f4043cf2ad"
                                                                                                    target="_blank" data-url-id="b60acc15-b246-5f88-b38f-c7ece71b9896"><img alt="Image" src="https://img.mmdocdn.com/mailmodo/image/upload/ar_946:1600,c_crop/v1756704504/editor/p/62dc8626-eafe-4c68-a935-861517fb9628/b20f300699305eadf65f9988cb020bb2_cd9fdw.jpg"
                                                                                                        style="border:0 solid transparent;border-radius:0;display:block;outline:0;text-decoration:none;height:auto;width:100%;max-width:100%;font-size:13px"
                                                                                                        width="100%" height="auto"></a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <!--[if mso | IE]></td></tr></table><![endif]-->
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!--[if mso | IE]></td></tr></table></td></tr><tr><td class="bl-typography-block-wrapper-outlook -outlook bg-formf3fa44-outlook" width=3D"100%" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="bl-typography-block-wrapper-outlook -outlook bg-formf3fa44-outlook" role="presentation" style="width:100%;" width="100%" bgcolor="#00000000" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
                            <div class="bl-typography-block-wrapper bg-formf3fa44" style="background:#00000000;background-color:#00000000;margin:0 auto;border-radius:0;width:100%;max-width:none">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#00000000;background-color:#00000000;width:100%;border-radius:0">
                                    <tbody>
                                        <tr>
                                            <td style="border:0 solid transparent;direction:ltr;font-size:0;padding:0;text-align:center">
                                                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style=3D"vertical-align:top;width:584px;" ><![endif]-->
                                                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:transparent;border:0 solid transparent;border-radius:0;vertical-align:top" width="100%">
                                                        <tbody>
                                                            <tr>
                                                                <td style="background:0 0;font-size:0;word-break:break-word">
                                                                    <div style="height:6px;line-height:6px">&#x200A;</div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="background:0 0;font-size:0;word-break:break-word">
                                                                    <div style="height:12px;line-height:12px">&#x200A;</div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td align="center" class="amp-btn-wrapper" style="font-size:0;padding:0 0 12px 0;word-break:break-word">
                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;width:auto;line-height:100%">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td align="center" bgcolor="#178218" role="presentation" style="border-bottom:none;border-left:none;border-radius:600px;border-right:none;border-top:none;border:0 solid transparent;cursor:auto;font-style:normal;height:auto;background:#178218;padding:0"><a href="${baseUrl}/track/click/${trackingId}?url=${encodeURIComponent(`${baseUrl}/track/form/${trackingId}?subject=${encodeURIComponent(subject)}&campaignName=${encodeURIComponent(campaignName)}&campaignType=${encodeURIComponent(campaignType)}`)}&subject=${encodeURIComponent(subject)}&campaignName=${encodeURIComponent(campaignName)}&campaignType=${encodeURIComponent(campaignType)}"
                                                                                    style="display:inline-block;background:#178218;color:#fff;font-family:Helvetica;font-size:16px;font-style:normal;font-weight:400;line-height:1;letter-spacing:0;margin:0;text-decoration:none;text-transform:none;padding:10px 16px 10px 16px;border-radius:600px"
                                                                                    target="_blank" data-block-id="formjh3103" data-block-type="form" data-url-id="4b4b8338-bc10-5f03-b0ab-3d6e607e298c">Check Your Eligibility</a></td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <!--[if mso | IE]></td></tr></table><![endif]-->
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!--[if mso | IE]></td></tr></table></td></tr><tr><td class="bl-typography-block-wrapper-outlook -outlook bg-blockp7d3x304-outlook" width="100%" ><table align="center" border="0" cellpadding="0" cellspacing="0" class="bl-typography-block-wrapper-outlook -outlook bg-blockp7d3x304-outlook" role="presentation" style="width:100%;" width="100%" bgcolor="transparent" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
                            <div class="bl-typography-block-wrapper bg-blockp7d3x304" style="background:0 0;background-color:transparent;margin:0 auto;border-radius:0;width:100%;max-width:none">
                                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:0 0;background-color:transparent;width:100%;border-radius:0">
                                    <tbody>
                                        <tr>
                                            <td style="border:0 solid transparent;direction:ltr;font-size:0;padding:20px 0;padding-bottom:20px;padding-left:20px;padding-right:20px;padding-top:20px;text-align:center">
                                                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:560px;" ><![endif]-->
                                                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:transparent;border:0 solid transparent;border-radius:0;vertical-align:top" width="100%">
                                                        <tbody>
                                                            <tr>
                                                                <td align="center" style="font-size:0;padding:10px 25px;padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;word-break:break-word">
                                                                    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" ><tr><td><![endif]-->
                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td style="padding:0 16px 0 16px;vertical-align:middle">
                                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:36px">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td style="font-size:0;height:36px;vertical-align:middle;width:36px">
                                                                                                    <a href="https://tn.btrkr.com/clicks/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b/f7f858c4-e6f4-5fa4-b051-4dd602c58631?urlChildId=3Df5095aae-6ab8-5426-a3da-b2ee7af094cd&templateId=3D5e0488ba-5f90-4794-8b11-43f4043cf2ad"
                                                                                                    target="_blank" data-block-id="blockp7d3x304" data-block-type="block" data-url-id="f5095aae-6ab8-5426-a3da-b2ee7af094cd"><img alt="Facebook" height="36" src="https://img.mmdocdn.com/mailmodo/image/upload/editor/constants/social/color/square/facebook.png" style="display:block"
                                                                                                        width="36"></a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <!--[if mso | IE]></td><td><![endif]-->
                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td style="padding:0 16px 0 16px;vertical-align:middle">
                                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:36px">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td style="font-size:0;height:36px;vertical-align:middle;width:36px">
                                                                                                    <a href="https://tn.btrkr.com/clicks/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b/270b3a91-82dc-5e75-a955-d2e8927d1a1f?urlChildId=3Da8d0fa60-53dd-53b0-b9fb-32154263c02f&templateId=3D5e0488ba-5f90-4794-8b11-43f4043cf2ad"
                                                                                                    target="_blank" data-block-id="blockp7d3x304" data-block-type="block" data-url-id="a8d0fa60-53dd-53b0-b9fb-32154263c02f"><img alt="Instagram" height="36" src="https://img.mmdocdn.com/mailmodo/image/upload/editor/constants/social/color/square/instagram.png" style="display:block"
                                                                                                        width="36"></a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <!--[if mso | IE]></td><td><![endif]-->
                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td style="padding:0 16px 0 16px;vertical-align:middle">
                                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:36px">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td style="font-size:0;height:36px;vertical-align:middle;width:36px">
                                                                                                    <a href="https://tn.btrkr.com/clicks/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b/e58c52f0-8770-517e-a0e1-493df21e872f?urlChildId=3D096753f1-b6b7-59ff-8e0e-4c96af140d75&templateId=3D5e0488ba-5f90-4794-8b11-43f4043cf2ad"
                                                                                                    target="_blank" data-block-id="blockp7d3x304" data-block-type="block" data-url-id="096753f1-b6b7-59ff-8e0e-4c96af140d75"><img alt="Twitter" height="36" src="https://img.mmdocdn.com/mailmodo/image/upload/editor/constants/social/color/square/twitter.png" style="display:block"
                                                                                                        width="36"></a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <!--[if mso | IE]></td><td><![endif]-->
                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="float:none;display:inline-table">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td style="padding:0 16px 0 16px;vertical-align:middle">
                                                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:36px">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td style="font-size:0;height:36px;vertical-align:middle;width:36px">
                                                                                                    <a href="https://tn.btrkr.com/clicks/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b/7783cce8-b601-55c4-a296-7e46e8f644b7?urlChildId=3D9d364161-2241-545d-a656-b28a9a497b4e&templateId=3D5e0488ba-5f90-4794-8b11-43f4043cf2ad"
                                                                                                    target="_blank" data-block-id="blockp7d3x304" data-block-type="block" data-url-id="9d364161-2241-545d-a656-b28a9a497b4e"><img alt="Linkedin" height="36" src="https://img.mmdocdn.com/mailmodo/image/upload/editor/constants/social/color/square/Linkedin.png" style="display:block"
                                                                                                        width="36"></a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <!--[if mso | IE]></td></tr></table><![endif]-->
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td align="center" style="font-size:0;padding:10px 25px;padding-top:30px;padding-right:10px;padding-bottom:10px;padding-left:10px;word-break:break-word">
                                                                    <div style="font-family:Helvetica;font-size:16px;font-weight:400;letter-spacing:0;line-height:1.5;text-align:center;color:#1e293b">
                                                                        <p><span style="font-size:12px">Please Note: We are Start-up consultants and are merely a consultancy service-providing company and not affiliated with any Government/Non-Government Agency/Institutions/Organisation/Department.</span>
                                                                            <br><span style="font-size:12px"></span></p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <!--[if mso | IE]></td></tr></table><![endif]-->
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!--[if mso | IE]></td></tr></table></td></tr></table><![endif]-->
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!--[if mso | IE]></td></tr></table><![endif]-->
        </div><a style="display:inline-block;font-size:1px;height:1px;width:1px;max-height:1px;max-width:1px;overflow:hidden;color:transparent;mso-hide:all;" href="${baseUrl}/track/form/${trackingId}?campaignName=${encodeURIComponent(campaignName)}&campaignType=${encodeURIComponent(campaignType)}">Click here</a>
        <img
        width="1" height="1" alt="signature" src="https://tn.btrkr.com/opens/html/a6548890-d0d2-5a83-9922-c092e3102374/5a1d504a-f747-449c-b739-021eca44c63b">
            <table width="100%" align="center" style="margin-top: 12px;">
                <tbody>
                    <tr>
                        <td width="100%" align="center"> <a style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);" href="${baseUrl}/track/unsubscribe/${trackingId}">Unsubscribe</a>                            </td>
                    </tr>
                </tbody>
            </table><img border="0" width="1" height="1" alt="" src="https://sp-t1.mmtrkr.com/q/HqS1sy5U2Fd7Ut6r5ErJLQ~~/AASgtxA~/icSgsZRgYjbBEXZRScckeMXVikCd5EpAQ0spk2z4qR9NcRVFcvsFXwPN1bWAiiE06P2I_w2MpCA8FsIHJr7htA~~">

                <img
                   src="${baseUrl}/track/open-html/${trackingId}?campaignName=${encodeURIComponent(campaignName)}&campaignType=${encodeURIComponent(campaignType)}&subject=${encodeURIComponent(subject)}"
                   width="1"
                   height="1"
                   style="display:none;"
                />
        </body>

</html>
`;
};

export default htmlTemplate;
