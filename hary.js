function openModal(type) {
    document.querySelector('.hero').classList.add('blur');
    document.querySelector('.section').classList.add('blur');
    document.querySelector('.candidates').classList.add('blur');

    document.querySelector('.yoyo').classList.add('blur');
    document.querySelector('.meme').classList.add('blur');
    document.querySelector('.ella').classList.add('blur');
    document.querySelector('.kudu').classList.add('blur');

    document.querySelector('.companies').classList.add('blur');
    document.querySelector('.testimonial').classList.add('blur');
    document.querySelector('.footer').classList.add('blur');
    if (type === 'login') {
        document.getElementById('loginModal').style.display = 'flex';
    } else if (type === 'signup') {
        document.getElementById('signupModal').style.display = 'flex';
    }

}

function closeModal() {
  
    document.querySelector('.candidates').classList.remove('blur');
    document.querySelector('.companies').classList.remove('blur');
    document.querySelector('.testimonial').classList.remove('blur');
    document.querySelector('.hero').classList.remove('blur');

    document.querySelector('.yoyo').classList.remove('blur');
    document.querySelector('.meme').classList.remove('blur');
    document.querySelector('.ella').classList.remove('blur');
    document.querySelector('.kudu').classList.remove('blur');

    document.querySelector('.section').classList.remove('blur');
    document.querySelector('.footer').classList.remove('blur');
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'none';
}

const testimonials = [
    {
        img: "med.jpg",
        name: "Mohamed Bangura",
        title: "Software Engineer",
        quote: "“Harya helped me find my dream job! The platform is intuitive and the job matches were spot-on.”"
    },
    {
        img: "prof.png",
        name: "Moses Sesay",
        title: "Graphic Designer",
        quote: "“Harya helped me find my dream job! The platform is intuitive and the job matches were spot-on.”"
    },
    {
        img: "gen.jpg",
        name: "Peter Komba",
        title: "Marketer",
        quote: "“Harya helped me find my dream job! The platform is intuitive and the job matches were spot-on.”"
    },
    {
        img: "yo.jpg",
        name: "Ibrahim Sesay",
        title: "UI/UX Designer",
        quote: "“Harya helped me find my dream job! The platform is intuitive and the job matches were spot-on.”"
    },
    {
        img: "hi.jpg",
        name: "James Manna",
        title: "Software Engineer",
        quote: "“Harya helped me find my dream job! The platform is intuitive and the job matches were spot-on.”"
    }
];

let currentTestimonial = 0;

function updateTestimonial() {
    const testimonial = testimonials[currentTestimonial];
    document.getElementById('testimonial-img').src = testimonial.img;
    document.getElementById('testimonial-name').innerText = testimonial.name;
    document.getElementById('testimonial-title').innerText = testimonial.title;
    document.getElementById('testimonial-quote').innerText = testimonial.quote;
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    updateTestimonial();
}

function prevTestimonial() {
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    updateTestimonial();
}

window.onload = updateTestimonial;
