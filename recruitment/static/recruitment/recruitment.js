document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#listingtab').addEventListener('click', () => showdiv('listing'));
    document.querySelector('#hometab').addEventListener('click', () => showdiv('general'));
    if (document.querySelector('#newjobtab') != null) {
        document.querySelector('#newjobtab').addEventListener('click', () => showdiv('newjob'));
    }
    if (document.querySelector('#profiletab') != null) {
        document.querySelector('#profiletab').addEventListener('click', () => showdiv('profile'));
    }
    if (document.querySelector('#acceptedtab') != null) {
        document.querySelector('#acceptedtab').addEventListener('click', () => showdiv('accepted'));
    }
    document.querySelector('#job-form').addEventListener('submit', save_job);
    document.querySelector('#company-form').addEventListener('submit', loadcom);
    document.querySelector('#username-form').addEventListener('submit', load_profile_page);
    // By default, load the general page 
    showdiv("general");
});

function catchange() {
    document.querySelector('#catdiv').style.display = "none";
    document.querySelector('#companydiv').style.display = "none";

    let filter = document.querySelector('#filter').value;
    if (filter == "category") {
        document.querySelector('#catdiv').style.display = "block";
    }
    else if (filter == "company") {
        // use variable cat to send company username
        document.querySelector('#companydiv').style.display = "block";
    }
    else {
        load_base_entries(filter);
    }
}

function loadcom(event) {
    event.preventDefault();
    // fetch a new page based on the input information
    let filter = document.querySelector('#filter').value;
    let cat = document.querySelector('#companyname').value;

    load_entries(filter, 1, cat);
}

function loadcat() {
    // fetch a new page based on the input information
    let filter = document.querySelector('#filter').value;
    let cat = document.querySelector('#catselect').value;

    load_entries(filter, 1, cat);
}

function showdiv(div){ //, filter, page, listingcount, preload) { 
    // preload the nth entry, check if n < listingcount, n % listingcount = page number or something
    document.querySelector('#heading').style.display = 'block';
    document.querySelector('#general').style.display = 'none';
    document.querySelector('#listing').style.display = 'none';
    document.querySelector('#newjob').style.display = 'none';
    document.querySelector('#profile').style.display = 'none';
    document.querySelector('#accepted').style.display = 'none';
    document.querySelector(`#${div}`).style.display = 'block';

    // show only the latest category listing and heading if viewing main page -> on click convert to category based listing, load the clicked entry
    if (div == "general") {
        document.querySelector('#heading').innerHTML = "<h2>Welcome</h2>";
        // generate a set of divs to store the new entries
        document.querySelector('#general').style.display = 'block';
        load_homepage();
    }
    else if (div == "newjob") {
        document.querySelector('#heading').innerHTML = "<h2>New Job Posting</h2>";

        // clear the entries in the text field
        document.querySelector('#jobtitle').value = '';
        document.querySelector('#description').value = '';
        document.querySelector('#category').value;
        document.querySelector('#startingpay').value = 0;
    }
    else if (div == "listing") {
        // add a button to return to listing page in main (state manager of sorts)
        document.querySelector('#listing').style.display = 'block';
        let filter = document.querySelector('#filter').value;
        document.querySelector('#heading').innerHTML = `<h2>Listing</h2>`;

        // get the list of entries
        load_base_entries(filter);
    }
    else if (div == "profile") {
        document.querySelector('#heading').innerHTML = "<h2>Profile</h2>";
        load_profile_page();
    }
    else if (div == "accepted") {
        document.querySelector('#heading').innerHTML = "<h2>Accepted Listings</h2>";
        load_accepted_page();
    }
}

function load_accepted_page() {
    // clear out the div
    document.querySelector('#accepted').innerHTML = "";
    fetch(`/accepted`, {method: 'GET'})
    .then(response => response.json()) //convert data to json
    .then(data => {
        document.querySelector('#accepted').appendChild(generate_list_accepted(data.message));
    });
}

function generate_list_accepted(listingarr) {
    const listingcontainer = document.createElement('div');
    listingarr.forEach(listing => {
        // show the info for each listing and bring to entry page on click or just do it like listing page
        let new_entry = create_entry(listing);
        var buttons = new_entry.getElementsByTagName('button');
        if (buttons) {
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].remove();
          }
        }
        listingcontainer.appendChild(new_entry);
    });
    return listingcontainer;
}

function load_homepage() {
    // clear the homepage and fill with heading information
    document.querySelector('#general').innerHTML = "<h1>Current Applications</h1>";

    fetch(`/main`, {method: 'GET'})
    .then(response => response.json()) //convert data to json
    .then(data => {
        if (data.user) { // this indicates recruiter
            // show all current listings and give option to delete / view all users
            const listing = document.createElement('div');
            listing.appendChild(generate_list_recruiter(data.message));
            document.querySelector('#general').appendChild(listing);
        } else if (document.getElementById('user_id').textContent != "null") { // this indicates non-recruiter
            // show the general page of a user i.e. latest listings
            const applied = document.createElement('div');
            applied.innerHTML = "<h4>Listings you applied to</h4>"
            applied.appendChild(generate_list_applicant(data.app, 0));
            const latest = document.createElement('div');
            latest.innerHTML = "<h4>Latest listings from categories you follow</h4>"
            latest.appendChild(generate_list_applicant(data.message, 5));

            document.querySelector('#general').appendChild(applied);
            document.querySelector('#general').appendChild(latest);
        } else {
            const login = document.createElement('div');
            login.innerHTML = "<h4>Login to view customized homepage</h4>"
            document.querySelector('#general').appendChild(login);
        }
    });
}

function generate_list_applicant(listingarr, limit) {
    const listingcontainer = document.createElement('div');
    let i = 0;
    listingarr.forEach(listing => {
        // show the info for each listing and bring to entry page on click or just do it like listing page
        if (limit == 0 || i < limit) {
            i++;
            listingcontainer.appendChild(create_entry(listing));
        }
    });
    return listingcontainer;
}

function generate_list_recruiter(listingarr) {
    const listingcontaineropen = document.createElement('div');
    listingcontaineropen.innerHTML = "<h2>Open Listings</h2>";
    const listingcontainerclose = document.createElement('div');
    listingcontainerclose.innerHTML = "<h2>Closed Listings</h2>";
    listingarr.forEach(listing => {
        // create a div 
        const listentry = document.createElement('div');
        listentry.className = "listing-entry";
        listentry.innerHTML = `<strong>${listing.title}</strong> <small>${listing.applicantcount} applied</small> `;
        // add a button to load the profile of the applicant 
        const applicantcontainer = document.createElement('div');
        // the applicant container should contain a list of names and a button to view their profiles
        listing.applicant.forEach(applicant => {
            applicantcontainer.appendChild(create_applicant(applicant, listing));
        });

        let is_expanded = false;
        let profilebutton = create_button("View Applicants");
        profilebutton.className = 'buttons';
        profilebutton.addEventListener('click', function() {
            is_expanded = !is_expanded;
            if (is_expanded) {
                applicantcontainer.style.display = "block";
                profilebutton.innerHTML = "Hide Applicants";
            } else {
                applicantcontainer.style.display = "none";
                profilebutton.innerHTML = "View Applicants";
            }
        });

        let markdonebutton = create_button('Close Listing');
        markdonebutton.className = 'buttons';
        markdonebutton.addEventListener('click', function() {
            let postData = JSON.stringify({
                'q': listing.id
            });
            let csrftoken = getCookie('csrftoken');
            fetch('update', {method: 'PUT', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // this puts listings under the "closed" section
                listingcontainerclose.appendChild(listentry);
            });
        });
        let deletebutton = create_button('Delete');
        deletebutton.addEventListener('click', function() {
            let postData = JSON.stringify({
                'q': listing.id
            });
            let csrftoken = getCookie('csrftoken');
            fetch('delete', {method: 'PUT', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
            .then(response => response.json())
            .then(data => {
                console.log(data);
                listentry.remove();
            });
        });
        applicantcontainer.style.display = "none";
        listentry.appendChild(profilebutton);
        if (listing.isclosed) {
            listingcontainerclose.appendChild(listentry);
        } else {
            listentry.appendChild(markdonebutton);
            listingcontaineropen.appendChild(listentry);
        }
        listentry.appendChild(deletebutton);
        listentry.appendChild(applicantcontainer);
    });
    const listingcontainer = document.createElement('div');
    listingcontainer.appendChild(listingcontaineropen);
    listingcontainer.appendChild(listingcontainerclose);
    return listingcontainer;
}

function create_button(name) {
    let button = document.createElement('button');
    button.className = 'buttons';
    button.innerHTML = name;
    return button;
}

function create_applicant(data, listing) {
    const applicantcontainer = document.createElement('div');
    applicantcontainer.className = "comment-inner";
    applicantcontainer.innerHTML = `${data.username}`;

    const loadprofilebutton = create_button('View');
    loadprofilebutton.addEventListener('click', function() {
            document.querySelector('#heading').style.display = 'block';
            document.querySelector('#general').style.display = 'none';
            document.querySelector('#listing').style.display = 'none';
            document.querySelector('#newjob').style.display = 'none';
            document.querySelector('#profile').style.display = 'block';
            load_profile(data.username);
    });

    const acceptbutton = create_button(data.accepted?'Unaccept':'Accept');
    acceptbutton.addEventListener('click', function () {
        let csrftoken = getCookie('csrftoken');
        let postData = JSON.stringify({
            'listingid': listing.id,
            'applicantid': data.id
        });
        fetch('accept', {method: 'POST', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
        .then(response => response.json())
        .then(acceptdata => {
            if(acceptdata.error) {
                console.log("Failed to update acceptance status of applicant.")
            } else {
                acceptbutton.innerHTML = acceptdata.accepted?"Unaccept":"Accept";
            }
        });
    });

    applicantcontainer.appendChild(loadprofilebutton);
    if (!listing.isclosed) {
        applicantcontainer.appendChild(acceptbutton);
    }
    return applicantcontainer;
}

function load_profile_page() {
    load_profile("");
}

function create_rating(value, id) {
    console.log(value);
    if (value > 5) {
        value = 5;
    }

    // creates an array of 5 elements
    let ratingarray = new Array(5);

    // fill each element in the array with suitable number
    for (i=0; i<5; i++) {
        let img = document.createElement('img');
        if (i < value) {
            img.setAttribute('src', 'static/recruitment/fstar.png');
        } else {
            img.setAttribute('src', 'static/recruitment/estar.png');
        }
        ratingarray[i] = img;
    }
    for (i=0; i<5; i++) {
        const index = i;
        ratingarray[index].addEventListener('click', function() {
            // create or make entry 
            console.log(index);
            let csrftoken = getCookie('csrftoken');
            let postData = JSON.stringify({
                'rating': index+1,
                'id': id,
            });
            fetch('rating/update', {method: 'POST', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
            .then(response => response.json())
            .then(data => {
                console.log(data);

                // update the stars with the right image post-change
                for (i=0; i<5; i++) {
                    if (i < data.score) {
                        ratingarray[i].setAttribute('src', 'static/recruitment/fstar.png');
                    } else {
                        ratingarray[i].setAttribute('src', 'static/recruitment/estar.png');
                    }
                }
            });
        });
    }

    const ratingcontainer = document.createElement('div');
    for (i=0; i<5; i++) {
        ratingcontainer.appendChild(ratingarray[i]);
    }
    return ratingcontainer;
}

function load_profile(param) {
    // clear the profile page
    document.querySelector('#heading').innerHTML = "<h2>Profile</h2>";
    document.querySelector('#profileinfo').innerHTML = "";

    // profile should also provide a search bar to find other users in html file
    let username = document.querySelector('#username').value;
    // param takes precedence over username value
    if (param != "") {
        username = param;
    }
    fetch(`/profile?` + new URLSearchParams({q: username}), {method: 'GET'})
    .then(response => response.json()) //convert data to json
    .then(data => {
        if (data.error) {
            document.querySelector('#profileinfo').innerHTML = "<h3>404: User or Company not found.</h3>";
            return;
        }
        // generate div for user info
        const profile_container = document.createElement('div');
        profile_container.className = "listing-entry";

        const info_container = document.createElement('div');
        info_container.innerHTML = `<h1>${data.user.username}</h1><small>Account created on ${data.user.timestamp}</small>`;

        const extra_container = document.createElement('div');
        if (data.user.isRecruiter) {
            // add in ratings mechanism here
            const ratingcontainer = create_rating(data.rating, data.user.id);

            // data contains "comments" for recruiter
            // if current user is NOT user id in company, show comment box
            const comment_container = document.createElement('div');
            comment_container.id = "comment_container";
            data["comment"].forEach(comment => {
                let comment_box = make_comment_box(comment);
                comment_container.appendChild(comment_box);
            });
            extra_container.innerHTML = "<br><strong>Here are what people have to say about this company:</strong>";
            if (JSON.parse(document.getElementById('user_id').textContent) != data.user.id){
                extra_container.appendChild(new_comment_box(data.user));
            }
            extra_container.appendChild(ratingcontainer);
            extra_container.appendChild(comment_container);
        }
        else {
            // data contains "resume", "interest" for employee
            // each box should have a description
            const checkboxcontainer = document.createElement('div');
            checkboxcontainer.innerHTML = "<br><strong>Categories you are interested in:</strong>"
            // for each box, make a div of title - checkbox
            const techcontainer = document.createElement('div');
            techcontainer.className = "jobform-row";
            techcontainer.innerHTML = "<div>tech</div>";

            const businesscontainer = document.createElement('div');
            businesscontainer.className = "jobform-row";
            businesscontainer.innerHTML = "<div>business</div>";

            const engineeringcontainer = document.createElement('div');
            engineeringcontainer.className = "jobform-row";
            engineeringcontainer.innerHTML = "<div>engineering</div>";

            const marketingcontainer = document.createElement('div');
            marketingcontainer.className = "jobform-row";
            marketingcontainer.innerHTML = "<div>marketing</div>";

            const softdevcontainer = document.createElement('div');
            softdevcontainer.className = "jobform-row";
            softdevcontainer.innerHTML = "<div>softdev</div>";

            var techbox = create_checkbox("tech", data);
            var businessbox = create_checkbox("business", data);
            var engineeringbox = create_checkbox("engineering", data);
            var marketingbox = create_checkbox("marketing", data);
            var softdevbox = create_checkbox("software development", data);

            techcontainer.appendChild(techbox);
            businesscontainer.appendChild(businessbox);
            engineeringcontainer.appendChild(engineeringbox);
            marketingcontainer.appendChild(marketingbox);
            softdevcontainer.appendChild(softdevbox);
            
            const resumecontainer = document.createElement('div');
            resumecontainer.innerHTML = "<br><strong>Resume Information:</strong>"
            const resume = document.createElement('textarea');
            resume.rows = 5;
            resume.className = "bordered-textfield";
            resume.value = data.resume;

            var updatebutton = create_button("Update");
            updatebutton.addEventListener('click', function() {
                // get update data and send it in json
                let csrftoken = getCookie('csrftoken');
                let postData = JSON.stringify({
                    'tech': techbox.checked,
                    'business': businessbox.checked,
                    'engineering': engineeringbox.checked,
                    'marketing': marketingbox.checked,
                    'software development': softdevbox.checked,
                    'resume': resume.value
                });
                fetch('profile/update', {method: 'PUT', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                });
            });
            if (JSON.parse(document.getElementById('user_id').textContent) == data.user.id) {
                checkboxcontainer.appendChild(techcontainer);
                checkboxcontainer.appendChild(businesscontainer);
                checkboxcontainer.appendChild(engineeringcontainer);
                checkboxcontainer.appendChild(marketingcontainer);
                checkboxcontainer.appendChild(softdevcontainer);
                extra_container.appendChild(checkboxcontainer);
            } else {
                resume.readOnly = true;
                resume.className = 'borderless-textfield';
            }
            resumecontainer.appendChild(resume);
            extra_container.appendChild(resumecontainer);
            if (JSON.parse(document.getElementById('user_id').textContent) == data.user.id) {
                extra_container.appendChild(updatebutton);
            }
        }
        profile_container.appendChild(info_container);
        profile_container.appendChild(extra_container);
        document.querySelector('#profileinfo').appendChild(profile_container);
    });
    document.querySelector('#username').value = "";
}

function create_checkbox(param, data) {
    var box = document.createElement('INPUT');
    box.setAttribute("type", "checkbox");
    if (data.interest.includes(param)) {
        box.checked = true;
    }
    return box;
}

function make_comment_box(comment) {
    // show poster, timestamp, comment
    var new_comment_box = document.createElement('div');
    new_comment_box.className = 'comment-entry';
    // add edit and update buttons
    new_comment_box.innerHTML = `<strong>${comment.commenter}</strong> <small>${comment.timestamp}</small><br>`;
    var textfield = document.createElement('textarea');
    textfield.rows = 3;
    textfield.className = "borderless-textfield";
    textfield.readOnly = true;
    textfield.value = comment.content;
    new_comment_box.appendChild(textfield);

    // current user made this comment, give them the option to edit it
    if (comment.commenter_id == JSON.parse(document.getElementById('user_id').textContent)) {
        var edit_button = create_button("Edit");
        var has_update = false;
        edit_button.addEventListener('click', function() {
            textfield.readOnly = false;
            textfield.className = "bordered-textfield";

            // add an update button for the textfield
            if (!has_update){
                var update_button = create_button("Update");
                update_button.addEventListener('click', function() {
                    // id of comment, textfield value
                    let postData = JSON.stringify({
                        'id': comment.id,
                        'content': textfield.value
                    });
                    let csrftoken = getCookie('csrftoken');
                    fetch('comment/update', {method: 'PUT', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                        update_button.remove();
                        textfield.readOnly = true;
                        has_update = false;
                    });
                    textfield.className = "borderless-textfield";
                });
                new_comment_box.appendChild(update_button);
            }
            has_update = true;
        });
        new_comment_box.appendChild(edit_button);
    }
    return new_comment_box;
}

// this function creates a box for a new comment
function new_comment_box(company) {
    var new_comment_box = document.createElement('div');
    new_comment_box.className = 'comment-entry';
    const textfield = document.createElement('textarea');
    textfield.rows = 3;
    textfield.className = "bordered-textfield";
    
    // create a submit button
    const comment_button = create_button('Comment');
    comment_button.className = 'buttons';
    comment_button.addEventListener('click', function() {
        let csrftoken = getCookie('csrftoken');
        let postData = JSON.stringify({
            'id': company.id,
            'content': textfield.value
        });
        fetch('profile/comment', {method: 'POST', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
        .then(response => response.json())
        .then(data => {
            console.log(data);
            document.querySelector('#comment_container').prepend(make_comment_box(data["comment"]));
            textfield.value="";
        });
    });
    new_comment_box.appendChild(textfield);
    new_comment_box.appendChild(comment_button);
    return new_comment_box;
}

// this function calls page 1
function load_base_entries(filter) {
    load_entries(filter, 1, "");
}

// this function fetches for a new page
function load_entries(filter, page, category) {
    // show list
    document.querySelector('#list').style.display = "block";
    // clear list
    document.querySelector('#list').innerHTML = "";
    if (page < 1) {
        page = 1;
    }
    console.log(page);
    // the fetch should also account for category
    fetch(`/listing/${filter}?` + new URLSearchParams({q: page, category: category}), {method: 'GET'})
    .then(response => response.json()) //convert data to json
    .then(data => {
        if (data.error) {
            document.querySelector('#list').innerHTML = "Company called " + category + " does not exist.";
            return;
        }
        // takes data and creates separate entry in list
        data.forEach(entry => {
            document.querySelector('#list').appendChild(create_entry(entry));
        })
        // on press the entry loads up main and fetches info to populate with
        // add in pagination buttons here
        const prevbutton = create_button("Previous");
        prevbutton.addEventListener('click', function() {
            load_entries(filter,page - 1,category);
        });
        const nextbutton = create_button("Next");
        nextbutton.addEventListener('click', function() {
            load_entries(filter,page + 1,category);
        });
        
        document.querySelector('#list').appendChild(prevbutton);
        document.querySelector('#list').appendChild(nextbutton);
    });
}

function create_entry(content) {
    // each entry should have title, date of posting, number of applicants, 
    const entry_container = document.createElement('div');
    entry_container.className = "listing-entry";
    const entry_summary = document.createElement('div');

    entry_summary.innerHTML = `<strong>${content.title}</strong> <small>${content.timestamp}</small>`;
    //button here for expanding job description

    const entry_details = document.createElement('div');
    entry_details.appendChild(load_entry(content));
    entry_details.style.display="none";

    const entry_button = create_button('View');
    let is_expanded = false;
    entry_button.addEventListener('click', function() {
        is_expanded = !is_expanded;
        if (is_expanded) {
            entry_details.style.display = "block";
            entry_button.innerHTML = 'Hide';
        } else {
            entry_details.style.display = "none";
            entry_button.innerHTML = 'View';
        }
    });
    entry_container.appendChild(entry_summary);
    entry_container.appendChild(entry_button);
    entry_container.appendChild(entry_details);
    return entry_container;
}

// show the job form and clear all the fields
function show_job_form() {
    document.querySelector('#heading').style.display = 'block';
    document.querySelector('#general').style.display = 'none';
    document.querySelector('#listing').style.display = 'none';
    document.querySelector('#newjob').style.display = 'block';

    document.querySelector('#heading').innerHTML = "<h1>New Job Posting</h1>";
}

// creates a job entry from the job posting form
function save_job(event) {
    event.preventDefault();
    // get the data from the form
    let title = document.querySelector('#jobtitle').value;
    
    let description = document.querySelector('#description').value;
    let category = document.querySelector('#category').value;
    let startingpay = document.querySelector('#startingpay').value;
    let postData = JSON.stringify({'title': title,
        'description': description,
        'category': category,
        'startingpay': startingpay
        });

    let csrftoken = getCookie('csrftoken');
    fetch('listing', {method: 'POST', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
    .then(response => response.json())
    .then(data => {
        console.log(data)
        showdiv('listing');
    });
}

function load_entry(data) {
    // load entry should expand the entry in a css div
    const expand_container = document.createElement('div');
    expand_container.className = "comment-inner";

    // entry should have title, date of posting, number of applicants, description
    const content_container = document.createElement('div');
    let title = `<h1>${data.title}</h1>\n`;
    let applicantcount = `number of applicants: ${data.applicant}\n<br>`;
    let employer = `by: ${data.creator}<br>`;
    let date = `posted on <small>${data.timestamp}</small>\n`;
    let content = `<p>${data.description}</p>\n`;
    content_container.innerHTML = title + employer + applicantcount + date + content;

    // add a button for applicant to apply to 
    const button_container = document.createElement('div');
    const apply_button = create_button('');
    if (data.has_applied) {
        apply_button.innerHTML = "Unapply";
    } else {
        apply_button.innerHTML = "Apply";
    }
    let csrftoken = getCookie('csrftoken');
    apply_button.addEventListener('click', function() {
        let postData = JSON.stringify({'id': data.id});
        fetch('apply', {method: 'POST', body: postData, credentials: 'same-origin', headers: {"X-CSRFToken": csrftoken}})
        .then(response => response.json())
        .then(applydata => {
            console.log(applydata["message"]);
            if (applydata["appstatus"]) {
                apply_button.innerHTML = "Unapply";
            } else {
                apply_button.innerHTML = "Apply";
            }
            applicantcount = `number of applicants: ${applydata.appcount}\n<br>`;
            content_container.innerHTML = title + employer + applicantcount + date + content;
        });
    });

    button_container.appendChild(apply_button);
    expand_container.appendChild(content_container);
    if (!data.isrecruiter) {
        expand_container.appendChild(button_container);
    }
    return expand_container;
}

// from https://docs.djangoproject.com/en/dev/ref/csrf/#ajax
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}