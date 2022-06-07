import time
import smtplib, ssl
import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

port = 465
smtp_server = "smtp.gmail.com"
sender_email = "noreply@cardinal.so"
password = ""

context = ssl.create_default_context()
data = pd.read_csv('./data/hacker-house-seattle.csv')

for i in data.itertuples():
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Solana Hacker House: Seattle, WA"
        message["From"] = sender_email
        message["To"] = i[2]
        text = f"""\
        
        Solana Hacker House Seattle 2022
        Hi {i[1]}, you are receiving this email because you requested to attend the Seattle installment of the Solana Inaugural Hacker House World Tour. 

        The event will take place at Shobox SoDo at: 1700 1st Ave S, Seattle, WA 98134 from 2/9-2/13.

        Please follow the instructions below to claim your NFT ticket which you will be required to present at the door in exchange for an event wristband.

        - Step I
        NOTE: If you do not have the Phantom mobile app, make sure to download it and link your Phantom wallet before proceeding. You’ll also need a negligible amount of SOL in the wallet for the claim transaction.

        Paste the claim link below into the browser tab on the Phantom mobile app and navigate to the claiming interface - NOT BROWSER
        {i[3]}

        - Step II
        Connect your Phantom wallet and claim the NFT ticket.
        
        It will be frozen in your wallet until it’s invalidated when scanned at the door. 

        - Step III
        Click the “View” button beneath the image to navigate to the Cardinal Dashboard

        - Step IV
        Tap the QR code icon on the top right corner of the ticket.

        You will be asked to sign a transaction to verify your ownership. 

        Scan the QR code to use and invalidate the ticket. 


        - Complete
        Your ticket has now been invalidated and can be seen as a memento NFT in the Phantom collectibles tab. 
        It is also now unfrozen and released for trading.
        """
        html = f"""\
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

        <head>
            <title></title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
            <!--[if !mso]><!-->
            <link href="https://fonts.googleapis.com/css?family=Bitter" rel="stylesheet" type="text/css">
            <link href="https://fonts.googleapis.com/css?family=Poppins" rel="stylesheet" type="text/css">
            <link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css">
            <!--<![endif]-->
            <style>
                * {{
                    box-sizing: border-box;
                }}

                body {{
                    margin: 0;
                    padding: 0;
                }}

                a[x-apple-data-detectors] {{
                    color: inherit !important;
                    text-decoration: inherit !important;
                }}

                #MessageViewBody a {{
                    color: inherit;
                    text-decoration: none;
                }}

                p {{
                    line-height: inherit
                }}

                @media (max-width:700px) {{
                    .row-content {{
                        width: 100% !important;
                    }}

                    .mobile_hide {{
                        display: none;
                    }}

                    .stack .column {{
                        width: 100%;
                        display: block;
                    }}

                    .mobile_hide {{
                        min-height: 0;
                        max-height: 0;
                        max-width: 0;
                        overflow: hidden;
                        font-size: 0px;
                    }}

                    .desktop_hide,
                    .desktop_hide table {{
                        display: table !important;
                        max-height: none !important;
                    }}

                    .reverse {{
                        display: table;
                        width: 100%;
                    }}

                    .reverse .column.first {{
                        display: table-footer-group !important;
                    }}

                    .reverse .column.last {{
                        display: table-header-group !important;
                    }}

                    .row-7 td.column.first>table {{
                        padding-left: 15px;
                        padding-right: 15px;
                    }}

                    .row-7 td.column.last>table {{
                        padding-left: 0;
                        padding-right: 0;
                    }}
                }}
            </style>
        </head>

        <body style="background-color: #FFFFFF; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
            <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #FFFFFF;">
                <tbody>
                    <tr>
                        <td>
                            <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="25%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-top:30px;width:100%;padding-right:0px;padding-left:0px;padding-bottom:5px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/d1DYbNn__400x400_1.png" style="display: block; height: auto; border: 0; width: 170px; max-width: 100%;" width="170" alt="I'm an image" title="I'm an image"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="25%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                            <table class="social_block mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-top:35px;text-align:left;padding-right:0px;padding-left:0px;">
                                                                        <table class="social-table" width="36px" border="0" cellpadding="0" cellspacing="0" role="presentation" align="left" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                            <tr>
                                                                                <td style="padding:0 4px 0 0;"><a href="https://twitter.com/HackerHouseSOL" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/twitter@2x.png" width="32" height="32" alt="Twitter" title="twitter" style="display: block; height: auto; border: 0;"></a></td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                        </td>
                                                        <td class="column" width="25%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                            <table class="social_block mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-right:15px;padding-top:35px;text-align:right;padding-left:0px;">
                                                                        <table class="social-table" width="36px" border="0" cellpadding="0" cellspacing="0" role="presentation" align="right" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                            <tr>
                                                                                <td style="padding:0 0 0 4px;"><a href="https://twitter.com/cardinal_labs" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/circle-color/twitter@2x.png" width="32" height="32" alt="Twitter" title="twitter" style="display: block; height: auto; border: 0;"></a></td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                        </td>
                                                        <td class="column" width="25%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-top:40px;width:100%;padding-right:0px;padding-left:0px;padding-bottom:5px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/cardinal-titled.png" style="display: block; height: auto; border: 0; width: 170px; max-width: 100%;" width="170" alt="I'm an image" title="I'm an image"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 25px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:25px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
                                                                                <p style="margin: 0; text-align: center; letter-spacing: 1px;"><span style="font-size:34px;"><strong>Solana Hacker House Seattle 2022</strong></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-top:20px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 18px; color: #ffffff; line-height: 1.5;">
                                                                                <p style="margin: 0; font-size: 16px; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;">Hi {i[1]}, you are receiving this email because you requested to attend the Seattle installment of the Solana Hacker House Inaugural World Tour.&nbsp;</span></p>
                                                                                <p style="margin: 0; font-size: 16px; text-align: center; mso-line-height-alt: 18px;">&nbsp;</p>
                                                                                <p style="margin: 0; font-size: 16px; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;">The event will take place at Shobox SoDo at</span></p>
                                                                                <p style="margin: 0; font-size: 16px; text-align: center;"><u><strong><span style="font-size:16px;"><em> 1700 1st Ave S, Seattle, WA 98134 from 2/9-2/13.</em></span></strong></u></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-left:15px;padding-right:15px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><a href="www.example.com" target="_blank" style="outline:none" tabindex="-1"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/passSeattle.gif" style="display: block; height: auto; border: 0; width: 408px; max-width: 100%;" width="408" alt="valentines day" title="valentines day"></a></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td>
                                                                        <div style="font-family: sans-serif">
                                                                            <div style="font-size: 14px; mso-line-height-alt: 16.8px; color: #fff; line-height: 1.2; font-family: Poppins, Arial, Helvetica, sans-serif;">
                                                                                <p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:22px;"><em><strong>Claim Below</strong></em></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:20px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 18px; color: #fff; line-height: 1.5;">
                                                                                <p style="margin: 0; font-size: 12px; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;">Please follow the instructions below to claim your NFT ticket which you will be required to present at the door in exchange for an event wristband.</span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:10px;padding-right:10px;padding-top:20px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 18px; color: #777; line-height: 1.5;">
                                                                                <p style="margin: 0; font-size: 12px; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;"><strong>If you have any issues, reach out to </strong><em><u>info@cardinal.so</u></em></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:15px;padding-top:30px;text-align:center;width:100%;">
                                                                        <h1 style="margin: 0; color: #fff; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 30px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><strong>Step I</strong></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 16.8px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; text-align: center;">NOTE: If you do not have the Phantom mobile app, make sure to download it and link your Phantom wallet before proceeding. You’ll also need a negligible amount of SOL in the wallet for the claim transaction.</p>
                                                                                <p style="margin: 0; mso-line-height-alt: 16.8px;">&nbsp;</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-4" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="16.666666666666668%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="text-align:center;width:100%;">
                                                                        <h1 style="margin: 0; color: #555555; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 23px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="15" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td>
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image002.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image001.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="16.666666666666668%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="text-align:center;width:100%;padding-top:5px;padding-bottom:5px;">
                                                                        <h1 style="margin: 0; color: #555555; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 23px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-5" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 16.8px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; text-align: center;">Paste the claim link below into the browser tab on the <em><strong>Phantom mobile</strong></em> app and navigate to the claiming interface - NOT BROWSER</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 16.8px; color: #777; line-height: 1.2;">
                                                                                <p style="margin: 0; text-align: center;">{i[3]}</p>
                                                                                <p style="margin: 0; mso-line-height-alt: 16.8px;">&nbsp;</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-6" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-left: 15px; padding-right: 15px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:20px;padding-top:90px;">
                                                                        <div style="font-family: sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Poppins', sans-serif; mso-line-height-alt: 14.399999999999999px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; font-size: 14px; text-align: left; letter-spacing: normal;"><span style="font-size:20px;"><strong>Step II</strong></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:30px;padding-left:30px;padding-right:35px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 21px; color: #fff; line-height: 1.5;">
                                                                                <p style="margin: 0;">Connect your Phantom wallet and claim the NFT ticket.</p>
                                                                                <p style="margin: 0; mso-line-height-alt: 21px;">&nbsp;</p>
                                                                                <p style="margin: 0;">It will be frozen in your wallet until it’s invalidated when scanned at the door.&nbsp;</p>
                                                                                <p style="margin: 0; font-size: 14px; mso-line-height-alt: 24px;"><span style="font-size:16px;">&nbsp;</span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/Screen%20Shot%202022-02-09%20at%204.17.47%20AM.jpeg" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/Screen%20Shot%202022-02-09%20at%205.05.41%20AM.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-7" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr class="reverse">
                                                        <td class="column first" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-left: 15px; padding-right: 15px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <div class="spacer_block" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                            <table class="image_block mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="width:100%;padding-right:0px;padding-left:0px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/Screen%20Shot%202022-02-09%20at%205.07.23%20AM.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="image_block desktop_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                <tr>
                                                                    <td style="width:100%;padding-right:0px;padding-left:0px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image009.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div class="spacer_block" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                            <table class="image_block mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-left:15px;padding-right:15px;padding-top:10px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image009.png" style="display: block; height: auto; border: 0; width: 227px; max-width: 100%;" width="227"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="image_block desktop_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                <tr>
                                                                    <td style="width:100%;padding-right:0px;padding-left:0px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/Screen%20Shot%202022-02-09%20at%205.07.23%20AM.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div class="spacer_block" style="height:5px;line-height:5px;font-size:1px;">&#8202;</div>
                                                        </td>
                                                        <td class="column last" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:20px;padding-top:65px;">
                                                                        <div style="font-family: sans-serif">
                                                                            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #fff; line-height: 1.2; font-family: 'Poppins', sans-serif;">
                                                                                <p style="margin: 0; font-size: 12px; letter-spacing: normal; mso-line-height-alt: 14.399999999999999px;">&nbsp;</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:20px;padding-top:40px;">
                                                                        <div style="font-family: sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Poppins', sans-serif; mso-line-height-alt: 14.399999999999999px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; font-size: 14px; text-align: left; letter-spacing: normal;"><span style="font-size:20px;"><strong>Step III</strong></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:15px;padding-left:30px;padding-right:35px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 21px; color: #fff; line-height: 1.5;">
                                                                                <p style="margin: 0;"><span style="background-color:transparent;">Click the “View” button beneath the image to navigate to the Cardinal Dashboard</span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-8" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-left: 15px; padding-right: 15px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:60px;">
                                                                        <div style="font-family: sans-serif">
                                                                            <div style="font-size: 12px; font-family: 'Poppins', sans-serif; mso-line-height-alt: 14.399999999999999px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; font-size: 14px; text-align: left; letter-spacing: normal;"><span style="font-size:20px;"><strong>Step IV</strong></span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:30px;padding-left:20px;padding-right:25px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 21px; color: #fff; line-height: 1.5;">
                                                                                <p style="margin: 0;">Tap the QR code icon on the top right corner of the ticket.</p>
                                                                                <p style="margin: 0; mso-line-height-alt: 21px;">&nbsp;</p>
                                                                                <p style="margin: 0;">You will be asked to sign a transaction to verify your ownership.&nbsp;</p>
                                                                                <p style="margin: 0; mso-line-height-alt: 21px;">&nbsp;</p>
                                                                                <p style="margin: 0;">Scan the QR code to use and invalidate the ticket.&nbsp;</p>
                                                                                <p style="margin: 0; font-size: 14px; mso-line-height-alt: 24px;"><span style="font-size:16px;">&nbsp;</span></p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/Screen%20Shot%202022-02-09%20at%205.09.54%20AM.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/IMG_7346.jpeg" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-9" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #777; line-height: 1.2; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif;">
                                                                                <p style="margin: 0; font-size: 12px; text-align: center;">The QR code contains a rotating signed transaction that is valid for less than a minute. It will ask you to re-sign periodically</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-10" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:15px;padding-top:30px;text-align:center;width:100%;">
                                                                        <h1 style="margin: 0; color: #fff; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 30px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><strong>Complete</strong></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 14px; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif; mso-line-height-alt: 16.8px; color: #fff; line-height: 1.2;">
                                                                                <p style="margin: 0; text-align: center;">Your ticket has now been invalidated and can be seen as a memento NFT in the Phantom collectibles tab.&nbsp;</p>
                                                                                <p style="margin: 0; text-align: center; mso-line-height-alt: 16.8px;">&nbsp;</p>
                                                                                <p style="margin: 0; text-align: center;">It is also now unfrozen and released for trading.</p>
                                                                                <p style="margin: 0; text-align: center; mso-line-height-alt: 16.8px;">&nbsp;</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-11" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="16.666666666666668%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="text-align:center;width:100%;">
                                                                        <h1 style="margin: 0; color: #555555; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 23px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="15" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td>
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image010.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;width:100%;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/image011.png" style="display: block; height: auto; border: 0; width: 197px; max-width: 100%;" width="197"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td class="column" width="16.666666666666668%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="heading_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="text-align:center;width:100%;padding-top:5px;padding-bottom:5px;">
                                                                        <h1 style="margin: 0; color: #555555; direction: ltr; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 23px; font-weight: normal; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"></h1>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-12" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #191919;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="text_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                <tr>
                                                                    <td style="padding-bottom:10px;padding-left:30px;padding-right:30px;padding-top:10px;">
                                                                        <div style="font-family: 'Trebuchet MS', Tahoma, sans-serif">
                                                                            <div style="font-size: 12px; mso-line-height-alt: 14.399999999999999px; color: #fff; line-height: 1.2; font-family: 'Montserrat', 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif;">
                                                                                <p style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;">&nbsp;</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="row row-13" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px;" width="680">
                                                <tbody>
                                                    <tr>
                                                        <td class="column" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                            <table class="image_block" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                <tr>
                                                                    <td style="padding-bottom:30px;padding-top:30px;width:100%;padding-right:0px;padding-left:0px;">
                                                                        <div align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/759493_742931/editor_images/cardinal-titled.png" style="display: block; height: auto; border: 0; width: 170px; max-width: 100%;" width="170" alt="Company logo" title="Company logo"></div>
                                                                    </td>
                                                                </tr>
                                                            </table>
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
            </table><!-- End -->
        </body>

        </html>
        """
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)

        time.sleep(1)
        try:
            with smtplib.SMTP_SSL(smtp_server, port, context=context) as server:
                server.login(sender_email, password)
                server.sendmail(sender_email, i[2], message.as_string())
            print(f"{i[1]},{i[2]} => {i[3]}")
        except:
            print("Error")
    except TypeError:
        pass