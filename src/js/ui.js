import { Format } from "./format.js";
import { Animator } from "./animator.js";
import { DOM } from "../index.js";
import { TEMPLATES } from "./template.js";
import { Project } from "./project.js";
import { Client } from "./client.js";

class UI {
	static addEntry(app, entry, destination) {
		// add event listener to each entry)
		if (entry.type != "session") {
			entry.addEventListener("click", () => {
				let object = app.getObject(entry.id);
				UI.toggleExpand(app, entry, object);
			});
		}

		// add element to DOM
		destination.appendChild(entry);
	}

	static toggleExpand(app, target, object) {
		// get all selected elements on the whole document
		let allSelecteds = document.querySelectorAll(".expanded");
		allSelecteds.forEach((elem) => {
			if (elem.type == target.type && elem != target) {
				// animate the drawer closing
				Animator.collapse(elem.nextSibling, 0.15);

				// de-select all elements matching clicked element's type
				elem.classList.toggle("expanded");
			}
		});

		// toggle expanded class of target
		target.classList.toggle("expanded");
		if (target.classList.contains("expanded")) {
			let childContainer = document.createElement("div");
			if (object.type == "client") {
				childContainer.classList.add("childProjects");
			} else if (object.type == "project") {
				childContainer.classList.add("childSessions");

				// If activeSession is blank...
				if (app.activeSession == null) {
					// add a "Clock In" Button to the top of the list of sessions
					let clock = document.createElement("button");
					clock.classList.add("btn-large", "btn-block");
					clock.id = "clock-in";

					// CLICK Clock-In button
					clock.addEventListener("click", () => {
						let projectID = clock.parentNode.previousSibling.id;
						app.clockIn(projectID);
						clock.remove();
					});
					clock.innerText = "Clock In";

					childContainer.insertAdjacentElement("afterbegin", clock);
				}
			}

			// place childContainer AFTER END of the expanded target
			target.insertAdjacentElement("afterend", childContainer);

			// fill childContainer with children
			let children = app.getChildren(object);
			UI.display(app, children, childContainer);
			Animator.expand(childContainer, 0.2);
		} else {
			// if it's not expanded, remove all children shit
			Animator.collapse(target.nextSibling, 0.2);
		}
	}

	static reset() {
		UI.hideMenu();

		// clear the actual readout
		DOM.readout.innerHTML = "";
	}

	static zoom(app, objectID) {
		// reset display to all clients
		UI.display(app, app.clients);
		let currentSession = app.sessions[objectID];
		let currentProject;
		let currentClient;

		// if there is a current session...
		if (currentSession) {
			// find the project that this session belongs to
			currentProject = app.projects[currentSession.projectID];
			currentClient = app.clients[currentProject.clientID];

			// expand the client by ID
			const clientElem = document.querySelector(`#${currentClient.id}`);
			UI.toggleExpand(app, clientElem, currentClient);

			// expand the project by ID
			const projectElem = document.querySelector(`#${currentProject.id}`);
			UI.toggleExpand(app, projectElem, currentProject);
		} else {
			// there is no session with this ID. Check if it's a project
			currentProject = app.projects[objectID];
			if (currentProject) {
				currentClient = app.clients[currentProject.clientID];

				// expand the client by ID
				const clientElem = document.querySelector(`#${currentClient.id}`);
				UI.toggleExpand(app, clientElem, currentClient);

				// expand the project by ID
				const projectElem = document.querySelector(`#${currentProject.id}`);
				UI.toggleExpand(app, projectElem, currentProject);
			} else {
				// original object must be a client...
				currentClient = app.clients[objectID];

				// expand the client by ID
				const clientElem = document.querySelector(`#${currentClient.id}`);
				UI.toggleExpand(app, clientElem, currentClient);
			}
		}
	}

	static display(app, dataSet, target = DOM.readout) {
		// build a sorted array from the dataSet
		let sorted = [];
		let keys = Object.keys(dataSet);
		keys.forEach((key) => {
			let currentObj = dataSet[key];

			for (let i = 0; i <= sorted.length; i++) {
				if (sorted[i] == undefined) {
					sorted.push(currentObj);
					i++;
					// compare the lastAccessed properties of currentObj and the current item in the sorted array
				} else if (currentObj.lastAccessed > sorted[i].lastAccessed) {
					sorted.splice(i, 0, currentObj);
					break;
				}
			}
		});

		for (let i = 0; i < sorted.length; i++) {
			let currentObj = app.getObject(sorted[i].id);
			let entry = document.createElement("div");
			entry.classList.add("entry");
			entry.id = currentObj.id;
			entry.type = currentObj.type;
			entry.innerHTML = Format.template(app, currentObj);
			let tag = entry.querySelector(".tag");

			/*
			ADD TAG CONTROL ELEMENTS
			*/

			tag.addEventListener("mouseenter", showControls, false);
			tag.addEventListener("mouseleave", hideControls, false);
			UI.addEntry(app, entry, target);
			// show the controls
			function showControls() {
				// add the delete button
				let deleteButton = document.createElement("button");
				deleteButton.id = "delete-button";
				deleteButton.classList.add("material-icons");
				deleteButton.innerText = "delete";
				this.insertAdjacentElement("afterbegin", deleteButton);
				deleteButton.addEventListener("click", () => {
					// show the confirm menu on click
					// replace the %type with the item type
					let temp = TEMPLATES.menus.delete.replace(
						/%type/g,
						currentObj.type.charAt(0).toUpperCase() + currentObj.type.slice(1),
					);

					UI.menu(app, temp);
					// add functionality to the menu buttons
					document.querySelector("#cancel").addEventListener("click", () => {
						UI.hideMenu();
					});
					document.querySelector("#submit").addEventListener("click", () => {
						UI.hideMenu();
						app.deleteItem(currentObj);
					});
				});

				// add the edit button
				let editButton = document.createElement("button");
				editButton.id = "edit-button";
				editButton.classList.add("material-icons");
				editButton.innerText = "edit";
				this.insertAdjacentElement("afterbegin", editButton);
				editButton.addEventListener("click", () => {
					alert("editing this item");
				});
			}
			// hide the controls
			function hideControls() {
				let deleteButton = this.querySelector("#delete-button");
				let editButton = this.querySelector("#edit-button");
				deleteButton.remove();
				editButton.remove();
			}
		}
	}

	static menu(app, template) {
		let menu = document.createElement("div");
		menu.id = "modal";
		menu.innerHTML = template;

		DOM.body.insertAdjacentElement("beforeend", menu);

		// grab the form type
		let type = template.split(">")[0].trim();
		type = type.substr(4, type.length - 6);

		if (type == "PROJECT") {
			let clientDD = document.querySelector("#client-ID");
			let appClients = Object.keys(app.clients);

			appClients.forEach((cli) => {
				let option = document.createElement("option");
				option.value = cli;
				option.innerText = app.clients[cli].name;
				clientDD.insertAdjacentElement("afterbegin", option);
			});

			let option = document.createElement("option");
			option.value = "";
			option.disabled = true;
			option.hidden = true;
			option.selected = true;
			option.innerText = "Select Client";
			clientDD.insertAdjacentElement("beforeend", option);
		}

		// add event listener to the freshly-generated back button

		let backButton = document.querySelector("#back");
		if (backButton) {
			backButton.addEventListener("click", () => {
				UI.reset();
				UI.display(app, app.clients);
			});
		}

		// add event listener to the freshly-generated submit button
		document.querySelector("#submit").addEventListener("click", () => {
			// if the form is for a client...
			if (type == "CLIENT") {
				// grab and store form values
				const FORM = {
					clientName: document.querySelector("#client-name"),
					clientAddress: document.querySelector("#client-address"),
					clientCity: document.querySelector("#client-city"),
					clientState: document.querySelector("#client-state"),
					clientZip: document.querySelector("#client-zip"),
					clientCountry: document.querySelector("#client-country"),
					clientContactName: document.querySelector("#client-contact"),
					clientEmail: document.querySelector("#client-email"),
					clientPhone: document.querySelector("#client-phone"),
					clientRate: document.querySelector("#client-rate"),
					clientInvoiceFrequency: document.querySelector("#client-frequency"),
					clientNotes: document.querySelector("#client-notes"),
				};

				// build new Client object
				const data = {
					Address: FORM.clientAddress.value.trim(),
					City: FORM.clientCity.value.trim(),
					Contact: FORM.clientContactName.value.trim(),
					Country: FORM.clientCountry.value.trim(),
					Email: FORM.clientEmail.value.trim(),
					Invoice_Frequency: FORM.clientInvoiceFrequency.value,
					Name: FORM.clientName.value.trim(),
					Notes: FORM.clientNotes.value.trim(),
					Phone: FORM.clientPhone.value.trim(),
					Rate: FORM.clientRate.value.trim(),
					State: FORM.clientState.value.trim(),
					Zip: FORM.clientZip.value.trim(),
				};

				// create new client object and validate
				let newClient = new Client(data);
				let errors = newClient.validate();

				// Show warning if there are errors. Run if not.
				if (errors.length > 0) {
					// show warning
					let message = "";
					errors.forEach((error) => {
						message += `• ${error}\n`;
					});
					alert(message);
					// UI.message();   //  << NEED TO WRTIE FUNCTION TO HAVE NICER ALERT!!
				} else {
					// pass the object to save it
					app.addClient(newClient);
					app.deriveProperties();
					UI.reset();
					UI.display(app, app.clients);
				}
			} else if (type == "PROJECT") {
				const FORM = {
					projectName: document.querySelector("#project-name"),
					projectRate: document.querySelector("#project-rate"),
					projectDescription: document.querySelector("#project-description"),
					projectClientID: document.querySelector("#client-ID"),
				};

				// build new project object
				const data = {
					Name: FORM.projectName.value.trim(),
					Description: FORM.projectDescription.value.trim(),
					Rate: FORM.projectRate.value.trim(),
					Client_ID: FORM.projectClientID.value,
				};

				// create new project object and validate
				let newProject = new Project(data);
				let errors = newProject.validate();

				// Show warning if there are errors. Run if not.
				if (errors.length > 0) {
					// show warning
					let message = "";
					errors.forEach((error) => {
						message += `• ${error}\n`;
					});
					alert(message);
					// UI.message();   // TODO: WRTIE FUNCTION TO HAVE NICER ALERT!! <----------------------
				} else {
					// pass the object to the app to save it
					app.addProject(newProject);
					app.deriveProperties();
					UI.reset();
					UI.display(app, app.clients);
				}
			}
		});
	}

	static hideMenu() {
		let menu = document.querySelector("#modal");
		if (menu) {
			menu.remove();
		}
	}

	static setUpEventListeners(app) {
		// Add Main Control Event Listeners
		DOM.btn_NewClient.addEventListener("click", function() {
			UI.menu(app, TEMPLATES.menus.client);
		});
		DOM.btn_NewProject.addEventListener("click", function() {
			UI.menu(app, TEMPLATES.menus.project);
		});

		// // Add Event listeners to Highlight clicked Filter Buttons
		// DOM.filters.addEventListener("click", function(e) {
		// 	let target = e.target;
		// 	if (target.tagName == "BUTTON") {
		// 		let buttons = DOM.filters.querySelectorAll("button");
		// 		buttons.forEach((button) => {
		// 			button.classList.remove("selected");
		// 		});
		// 		target.classList.add("selected");
		// 	}
		// });
	}

	static showClock(app, session, speed, delay) {
		// build clock element
		let clock = document.createElement("button");
		clock.classList.add("btn-block");
		clock.id = "clock";
		clock.innerHTML = TEMPLATES.clock;
		clock.addEventListener("click", () => {
			app.clockOut(session.id);
		});

		// add the clock to the DOM
		DOM.timer.insertAdjacentElement("beforeend", clock);

		// position and animate it
		let mag = parseFloat(window.getComputedStyle(clock).height);
		let offset = parseFloat(window.getComputedStyle(clock).marginBottom);
		DOM.timer.style.bottom = `${(mag + offset) * -1 }px`;
		Animator.clockIn(DOM.timer, "bottom", mag + offset, speed, delay);

		// grab the 3 output fields in the clock element
		let clockTime = DOM.timer.querySelector("h3");
		let clockClient = DOM.timer.querySelector("h6");
		let clockProject = DOM.timer.querySelector("p");

		// fill in the project name
		clockProject.innerText = app.projects[session.projectID].name;
		clockClient.innerText = app.clients[app.projects[session.projectID].clientID].name;

		app.timer = setInterval(updateTime, 1000);

		function updateTime() {
			// get current time in seconds
			let now = new Date();
			let jsTime = now.getTime().toString();
			jsTime = parseInt(jsTime.substr(0, jsTime.length - 3));

			// calculate difference in time since session was created and now
			let deltaTime = jsTime - session.clockIn.seconds;

			// format difference to HH:MM:SS
			let hhmmss = Format.secondsToHours(deltaTime);

			// update element
			clockTime.innerText = hhmmss;
		}
	}

	static hideClock() {
		document.querySelector("#clock").remove();
	}
}

export { UI };
