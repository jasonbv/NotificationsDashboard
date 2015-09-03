$(function(){

	notifications.initialize();

});

var notifications = {

	oneDay : 24*60*60*1000, // hours*minutes*seconds*milliseconds
	taskUrl : 'https://bits.bazaarvoice.com/jira/browse/',
	engineers : [],
	parents : [],
	htmlString : '',
	engineersObj : [],
	parentsObj : [],
	epicsObj : [],
	statusArray : 	['OPEN~To Do',
					'BLOCKED~Blocked',
					'IN PROGRESS~In Progress',
					'CODE REVIEW~Code Complete',
					'CODE REVIEWING~Reviewing',
					'CODE REVIEWED~Merged',
					'MERGING~Deploying To QA',
					'PROMOTED~Deployed To QA',
					'ONHOLD~Needs Other',
					'NOT WORKING~Verification Blocked',
					'VERIFYING~Verifying in QA',
					'VERIFIED~Verified in QA',
					'DEPLOYING TO PRODUCTION~Deploying To Prod',
					'AVAILABLE IN PRODUCTION~Deployed To Prod',
					'VERIFYING (L2)~Verifying On Prod',
					'VERIFIED (L2)~Verified On Prod',
					'CLOSED~Done'],
	
	
	
	
	initialize : function() {
	
		
	
		//start building out your HTML table
		var htmlString = ""
		htmlString += "<table>"
		htmlString += "<tr>"
		htmlString += "<th>" + $('#currentDate').html() + " </th>"
		
		//loop through each status on the jira board and add it as a header to the table
		$(notifications.statusArray).each(function(statusIndex,status){
			
			htmlString += "<th width=50 class='rotate'><div><span>" + status.split('~')[1] + "</span></div></th>"
			
		})
			
			
		htmlString += "</tr>"
		htmlString += "<tr><td class='small' colspan=18>&nbsp;</td></tr>"
		
	
		//THERE IS PROBABLY A BETTER WAY TO DO THIS IN JIRA BUT I DIDN"T HAVE TIME TO FIGURE IT OUT
	
		//loop through all of the epics from the json in the HTML file
		$(epicJiraJSON.issues).each(function(index,epicTicket){
		
			//grab the name of the epic
			var friendlyTaskString = epicTicket.fields.customfield_12621
			var taskString = ( epicTicket.fields.summary.length > 45 ) ? epicTicket.fields.summary.substring(0,45) + "..." : epicTicket.fields.summary
			
			
			htmlString += "<tr><td colspan=18 class='epic'>" + friendlyTaskString + "</td></tr>"
			//htmlString += "<td ></td></tr>"


			
			//go and grab all of the parents for this.........
			var storyObjects = getObjects(parentJiraJSON, 'customfield_12620', epicTicket.key)
			
			//stuff those stories into this epic so we can build out table out
			notifications.epicsObj.push({
				
				'key': epicTicket.key,
				'friendlyTaskString': friendlyTaskString,
				'taskString': taskString,
				'storyString': storyObjects
				
			});
			
			
			
			//loop through each of the stories within this epic
			$(notifications.epicsObj[index].storyString).each(function(storyIndex,story){
			
				
				
			
				var storyString = ( story.summary.length > 100 ) ? story.summary.substring(0,100) + "..." : story.summary
				htmlString += "<td colspan=18 class='story'>" + storyString + "</td></tr>"
				
				//go and grab all of the subtasks listed for this story
				$(story.subtasks).each(function(taskIndex,task){
					
					//to start our duration calculations, assume all tickets start their life in the Open Status
					notifications.currentStatus = "Open"
					
					//try and find the tasks
					var taskObjects = getObjects(jiraJSON.issues, 'id', task.id)
					
					
					//unfortunately there is inward / outward issues listed within other tasks that may throw a match with the getObjects function
					//could'nt find a function that would only search within jiraJSON.issues.key. 
					//because of this, sometimes we return more than one ticket, so let's loop through them and find the right one
					$(taskObjects).each(function(maybeIndex,maybeTask){
						
						//if this ticket has a changelog we know it is the right one
						//obviously not the right way to do this, but it works
						if ( maybeTask.changelog ) {
								
							//build your abbreviate task string
							var taskString = ( maybeTask.fields.summary.length > 45 ) ? maybeTask.fields.summary.substring(0,45) + "..." : maybeTask.fields.summary
							
							//build your assigned to string
							var assigneeString = ( !maybeTask.fields.assignee ) ? "Not Assigned" : maybeTask.fields.assignee.displayName
					
							//build out task link / assigned to / description cell
							htmlString += "<tr><td class='task'><a target=_blank href='" + notifications.taskUrl + maybeTask.key + "'>" + maybeTask.key + "</a> - " + assigneeString + " - " + taskString + "</td>"

							//set some times to the date the ticket was created to start our time counters
							notifications.updateTime = maybeTask.fields.created
							notifications.lastUpdateTime = maybeTask.fields.created
							
							//set up all of the time buckets for the different stages on the kanban board
							//we set them all to zero at first in case the ticket never hits that stage
							//we then use this to tally up time spent in this stage if the ticket jumps back and forth
							$(notifications.statusArray).each(function(statusIndex,status){
								maybeTask[status.split('~')[0]] = 0
							})
			
			
							
							//loop through all of the change log events
							$(maybeTask.changelog.histories).each(function(historyIndex,changeEvents){
								
									
								//grab each of the individual changes
								$(changeEvents.items).each(function(eventIndex,changeEvent){
								
									//grab the events where the status has changed
									if ( changeEvent.field == "status" ) {
									
										//change the last update time to when this event happened
										notifications.lastUpdateTime = changeEvents.created
										
										//create some date objects and calculate how long it has been
										var pastDate = new Date(notifications.updateTime)
										var lastUpdatedDate = new Date(notifications.lastUpdateTime)
										var diffDays = Math.round(Math.abs((pastDate.getTime() - lastUpdatedDate.getTime())/(notifications.oneDay)));
										
										
										//write that difference to the particular status item for this ticket
										//e.g. Open, Blocked, Deployed to QA, etc.
										maybeTask[changeEvent.fromString.toUpperCase()] = maybeTask[changeEvent.fromString.toUpperCase()] + diffDays
										
										//reset the updateTime to the events change time to reset the counter
										notifications.updateTime = changeEvents.created
										
										//set the current status to this events status
										notifications.currentStatus = changeEvent.toString
										
									} //end of if change event == status

								}) //end of loop through change events
									
							}) //end of histories loop


							//we now need to calculate how long we have been on the current state from when it changed until now
							pastDate = new Date(notifications.updateTime)
							lastUpdatedDate = new Date()
							var diffDays = Math.round(Math.abs((pastDate.getTime() - lastUpdatedDate.getTime())/(notifications.oneDay)));
							maybeTask[notifications.currentStatus] = maybeTask[notifications.currentStatus] + diffDays
							
							//now loop through all of the possible statuses, build the table cell and display how long the task sat in that 
							//status and highlight the cell for the status that the task is current;y in.
							$(notifications.statusArray).each(function(statusIndex,status){
								
								classString = ( maybeTask.fields.status.name.toUpperCase() === status.split('~')[0].toUpperCase() ) ? "current " : " "
								htmlString += "<td class='durationCell " + classString + "'>" + maybeTask[status.split('~')[0]] + "</td>"
							
							}) //end of loop through statuses
							
							
						} //end the sweep through the good ticket
							
					}) //end out loop through all of the tickets that getobjects found
						
					
					//close the table row for this particular task
					htmlString += "</tr>"
				
				
				}) //end the loop through the tasks
			
			}) //end the loop through the stories
			
			
			//add a little padding after the story
			htmlString += "<tr><td class='small' colspan=18>&nbsp;</td></tr>"
		
		}) //end the loop throug each epic
		
	
	//close the table and write out the html to the div
	htmlString += "</table>"
	$('div#htmlBlob').html(htmlString)
	
	} //end the initialize function
	


	
	
	
	
	
}




String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};


function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i == key && obj[key] == val) {
            objects.push(obj);
        }
    }
    return objects;
}

