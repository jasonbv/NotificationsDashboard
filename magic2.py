import logging
import urllib2
import base64
import json
import time
import ftplib
import io
import datetime

ftp = ftplib.FTP('waws-prod-sn1-001.ftp.azurewebsites.windows.net', 'bv-notifications\$bv-notifications', 'vn5SwvRZuFkQDFRlj5EjalJT42DoYNP2CgeoyGvycDoSrhcY6swsJZDzNicC')
ftp.cwd("/site/wwwroot")

#sdlfkjsdlfkjsdfl ksdjfls kdjflsd kjflkjlkjlkjlkjljk

timestr = time.strftime("%Y%m%d-%H%M%S")
writepath = "c:/notifications/"
filename = "notificationsAging-" + timestr + ".html"
issueList = []
parentList = []
uniqueIssueList = []
uniqueParentList = []

now = datetime.datetime.now()
print 


#target = open(filename, 'w') ## a will append, w will over-write 

htmlString = ""
htmlString +="<html>\n"
htmlString +="<head>\n"
htmlString +="<link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>\n"
htmlString +="<link rel='stylesheet' type='text/css' href='css/notifications.css'>\n"
htmlString +="<script type='text/javascript' src='javascript/jquery.js'></script>\n"
htmlString +="<script type='text/javascript' src='javascript/notifications.js'></script>\n"


htmlString +="</head>\n"
htmlString +="<body>\n"
htmlString +="<script>\n"




baseQuery = 'https://bits.bazaarvoice.com/jira/rest/api/2/search?jql=filter=23235&expand=changelog&maxResults=1000'
request = urllib2.Request(baseQuery)
base64string = base64.encodestring('%s:%s' % ('jwilmot', 'Pr0dmanager')).replace('\n', '')
request.add_header("Authorization", "Basic %s" % base64string)
for line in urllib2.urlopen(request):
	htmlString +="var jiraJSON = " + line
	parsed_json = json.loads(line)
	for issue in parsed_json['issues']:
		issueList.append(issue['fields']['parent']['key'])
	
uniqueIssueList = list(set(issueList))

htmlString +="</script>\n"
htmlString +="\n\n"
htmlString +="<script>\n"
print ",".join(uniqueIssueList)

baseQuery2 = 'https://bits.bazaarvoice.com/jira/rest/api/2/search?jql=%22issueKey%22%20in%20(' + ",".join(uniqueIssueList) + ')&fields=*all&maxResults=1000'
request2 = urllib2.Request(baseQuery2)
base64string = base64.encodestring('%s:%s' % ('jwilmot', 'Pr0dmanager')).replace('\n', '')
request2.add_header("Authorization", "Basic %s" % base64string)

#testinglkjlkjlkjlkjlkjlkjlkjlkjlkjljk

for line2 in urllib2.urlopen(request2):
	htmlString +="var parentJiraJSON = " + line2
	parsed_json2 = json.loads(line2)
	for issue in parsed_json2['issues']:
		if issue['fields']['customfield_12620'] is not None:
			parentList.append(issue['fields']['customfield_12620'])
			
htmlString +="</script>\n"
htmlString +="\n\n"
htmlString +="<script>\n"
			
uniqueParentList = list(set(parentList))
print ",".join(uniqueParentList)
		
baseQuery3 = 'https://bits.bazaarvoice.com/jira/rest/api/2/search?jql=%22issueKey%22%20in%20(' + ",".join(uniqueParentList) + ')&fields=*all&maxResults=1000'
request3 = urllib2.Request(baseQuery3)
base64string = base64.encodestring('%s:%s' % ('jwilmot', 'Pr0dmanager')).replace('\n', '')
request3.add_header("Authorization", "Basic %s" % base64string)

for line3 in urllib2.urlopen(request3):
	htmlString +="var epicJiraJSON = " + line3
	print line3
		
htmlString +="</script>\n"

htmlString +="\n\n"
htmlString +="<div id='htmlBlob'></div>\n"
htmlString += "<span id='currentDate'>" + now.strftime("%A") + ", " + now.strftime("%B") + " "  + now.strftime("%d") + "</span>\n"
htmlString +="</body>\n"
htmlString +="</html>"

 

print filename
htmlBytes = io.BytesIO(htmlString)
ftp.storbinary("STOR " + "hostingstart.html", htmlBytes)
ftp.quit()


