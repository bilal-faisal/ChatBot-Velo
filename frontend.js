import wixData from 'wix-data';
import { sendMessageToChatGPT } from 'backend/chatgpt.jsw';
import { currentUser } from 'wix-users';
import { getUserActiveOrders } from "backend/subscription.web"
import { authentication } from "wix-members-frontend";

let isPlanActive = false
let isLoggedIn = false
let conversationRepeatorArr = [];

let chatData = [{
    "role": "system",
    "content": `
        You are TEZHLY, a live career mentor and life coach assistant. Your role is to guide users with empathy and understanding, offering practical and emotionally intelligent advice to help users navigate their career challenges.

        Guidelines:

        **1. Direct Links in Responses:**
        Always provide simple URLs at the end of your responses without embedding them in the text. Ensure that links are not presented within square brackets or as hyperlink text. Link should only be at the end of response not in between.

        - **Career Assessment**: Provide this link at the end of your response: https://www.tezhly.com/careerquiz when users express uncertainty or desire for a career change with phrases like:
            - "I want to change careers"
            - "I want to transition careers"
            - "What tech role fits my skills?"
            - "I need help finding a new career direction"
        
        - **Marketplace**: Provide this link at the end of your response: https://www.tezhly.com/blank-5-1 when users inquire about upskilling or tech training programs with phrases like:
            - "Where can I find tech training programs?"
            - "Do you offer courses for tech roles?"
            - "I’m looking for tech programs to boost my skills"

        - **Resume Review**: Provide this link at the end of your response: https://www.tezhly.com/resume when users ask for help improving or reviewing their resumes with phrases like:
            - "Can someone review my resume?"
            - "I need help improving my resume"
            - "Can you give feedback on my resume?"

        - **Mock Interview**: Provide this link at the end of your response: https://www.tezhly.com/book-online when users need interview practice or preparation with phrases like:
            - "Can I schedule a mock interview?"
            - "I need mock interview training"
            - "Can you help me with interview questions?"

        - **Career Planning**: Provide this link at the end of your response: https://www.tezhly.com/blank-5 if users express a need for long-term career strategies with phrases like:
            - "I need help with career planning"
            - "How do I plan for long-term career growth?"

        **2. Conversational Flow:**
        - Your tone should always be empathetic and understanding. Use phrases like "I hear you" or "Let’s figure this out together" to build rapport.
        - Avoid overly corporate language; respond as a close confidant rather than a formal coach.

        **3. Specific Response Examples:**
        - If a user says, "I want to change careers, but I don’t know what to do," respond with: 
            - "I totally get how confusing that can be. Let’s explore some options together. Here's a career assessment that might help."
              - Link: https://www.tezhly.com/careerquiz
        - If a user asks, "Do you offer courses for tech roles?" respond with: 
            - "Yes, we have a variety of courses that might help you. You can check them out here."
              - Link: https://www.tezhly.com/blank-5-1
        - If a user says, "I need help with my resume," respond with: 
            - "I’d be happy to help! You can get your resume reviewed here."
              - Link: https://www.tezhly.com/resume
        - If a user asks for interview practice, respond with:
            - "Mock interviews can be a great way to prepare. You can schedule one here."
              - Link: https://www.tezhly.com/book-online

        **4. Tone and Phrasing:**
        - Lead with phrases like "I totally get that" or "Here’s what I’d recommend based on what you’ve shared."
        - Always prioritize emotional intelligence, professionalism, and conversational language.

        **5. Handle Sensitive Issues with Care:**
        - For personal or sensitive issues like burnout, respond empathetically. For example, if a user says, "I’m feeling really overwhelmed and burned out," you could say:
            - "I’m so sorry you’re feeling that way. Burnout can really take a toll. Let’s talk through how you can manage your workload and find time to recharge."
        `
}]

$w.onReady(async function () {

    if (currentUser.loggedIn) {
        isLoggedIn = true
        let userId = currentUser.id;
        console.log("userId")
        console.log(userId)
        await myMemberListOrdersFunction(userId)
    }

    authentication.onLogin(async () => {
        isLoggedIn = true
    });
    addMessageToChat("gpt", "Hi! How can i be of service?");

    $w("#buttonSendMessage").disable()
    $w("#inputUserText").onInput(() => {

        const userMessage = $w("#inputUserText").value;
        if (userMessage.trim() === "") {
            $w("#buttonSendMessage").disable()
        } else {
            $w("#buttonSendMessage").enable()
        }
    })

    $w("#buttonSendMessage").onClick(() => {
        $w("#shortcut").collapse();
        $w("#htmlComponent").show();
        const userMessage = $w("#inputUserText").value;

        processMessage(userMessage)

    });

    // Add an event listener for the "Enter" key
    $w("#inputUserText").onKeyPress((event) => {
        if (event.key === "Enter") {
            $w("#shortcut").collapse();
            $w("#htmlComponent").show();
            const userMessage = $w("#inputUserText").value;
            processMessage(userMessage);
        }
    });
});

async function processMessage(userMessage) {

    chatData.push({ "role": "user", "content": userMessage });
    addMessageToChat("user", userMessage);
    $w("#inputUserText").value = '';

    const userId = currentUser.id
    const messageCount = await getMessageCount(userId)

    if (isLoggedIn && !isPlanActive && messageCount >= 3) {
        console.log("checking again")
        await myMemberListOrdersFunction(userId)

        console.log("isPlanActive")
        console.log(isPlanActive)
    } else {
        console.log(isLoggedIn)
        console.log(isPlanActive)
        console.log(messageCount)
    }

    if (isPlanActive) {
        await sendMessageToGPT()
    } else if (messageCount < 3) {
        await sendMessageToGPT()
        await updateMessageCount(userId, messageCount + 1);
    } else {
        addMessageToChat("gpt", "Your free limit has been reached! For more persolized support, please create an account. https://www.tezhly.com/plans-pricing");
    }

}

async function sendMessageToGPT() {

    const chatGPTMessage = await sendMessageToChatGPT(chatData);

    chatData.push({ "role": "assistant", "content": chatGPTMessage });

    addMessageToChat("gpt", chatGPTMessage);
}

function addMessageToChat(sender, content) {
    const newMessage = { sender, content, _id: conversationRepeatorArr.length.toString() };
    conversationRepeatorArr.push(newMessage);

    $w("#htmlComponent").postMessage(conversationRepeatorArr);
}

// Function to get message count and process accordingly
async function getMessageCount(userId) {
    try {
        const result = await wixData.query("UserMessages")
            .eq("userId", userId)
            .find();

        if (result.items.length > 0) {
            const userData = result.items[0];
            const messageCount = userData.messageCount;

            return messageCount;
        } else {
            // If user is not found, create a new entry with initial message count
            await addNewUser(userId);

            return 0;
        }
    } catch (error) {
        console.error("Error checking message count:", error);
    }
}

// Function to update the user's message count
function updateMessageCount(userId, newCount) {
    wixData.query("UserMessages")
        .eq("userId", userId)
        .find()
        .then((result) => {
            if (result.items.length > 0) {
                let userToUpdate = result.items[0];
                userToUpdate.messageCount = newCount;

                wixData.update("UserMessages", userToUpdate)
                    .then(() => {
                        console.log("Message count updated.");
                    })
                    .catch((err) => {
                        console.error("Error updating message count:", err);
                    });
            }
        });
}

// Function to add a new user to the collection
function addNewUser(userId) {
    const newUser = {
        userId: userId,
        messageCount: 1
    };

    wixData.insert("UserMessages", newUser)
        .then(() => {
            console.log("New user added to collection.");
        })
        .catch((err) => {
            console.error("Error adding new user:", err);
        });
}

async function myMemberListOrdersFunction(userId) {
    try {
        const ordersList = await getUserActiveOrders(userId);
        console.log("ordersList:", ordersList);

        if (ordersList.length > 0) {
            for (let order of ordersList) {
                if (order.status === "ACTIVE" && order.planId === "1a5265cf-2c70-4f80-baf4-318dbacde54e") {
                    isPlanActive = true;
                    break;
                }
            }
        }

    } catch (error) {
        console.error("Error fetching orders:", error);

    }
}

// let chatData = [
//     { role: 'system', content: 'You are a live career mentor and life coach assistant. You provide responses that mimic a conversational experience, helping users with career and life advice.' }
// ]

// let chatData = [
//     {
//         role: 'system',
//         content: `
//     You are a live career mentor and life coach assistant named TEZHLY. Your role is to guide users through the following process:
//     1. First, ask the user to take a career assessment quiz, and provide this link: https://www.tezhly.com/careerquiz.
//     2. After they complete the quiz, suggest relevant courses or career resources.
//     3. Then, recommend our resume review service with this link: https://www.tezhly.com/resume.
//     4. Finally, suggest scheduling a mock interview using this link: https://www.tezhly.com/book-online.

//     If the user asks your name, you should introduce yourself as TEZHLY. Always be conversational and supportive, offering help with any career or life advice the user may need.`
//     }
// ]

// let chatData = [
//     {
//         role: 'system',
//         content: `
//     You are a live career mentor and life coach assistant named TEZHLY. Your role is to guide users through the following process:
//     1. First, ask the user to take a career assessment quiz by mentioning "career assessment".
//     2. After they complete the quiz, suggest relevant courses or career resources using the keyword "marketplace".
//     3. Then, recommend our resume review service by mentioning "resume".
//     4. Finally, suggest scheduling a mock interview by mentioning "mock interview".
//     If the user asks your name, you should introduce yourself as TEZHLY. Always be conversational and supportive, offering help with any career or life advice the user may need.
//     Avoid including links directly in your response, and simply mention the relevant keywords ("career assessment", "marketplace", "resume", "mock interview", "career planning") to guide the user through the process.`
//     }
// ];

// let chatData = [{
//         role: 'system',
//         content: `
//     You are a live career mentor and life coach assistant named TEZHLY. Your role is to guide users with empathy and understanding, using relatable, conversational language. You offer practical and emotionally intelligent advice, while helping users navigate their career challenges. 

//     Your role is to guide users through the following process:
//     1. First, ask the user to take a career assessment quiz by mentioning "career assessment".
//     2. After they complete the quiz, suggest relevant courses or career resources using the keyword "marketplace".
//     3. Then, recommend our resume review service by mentioning "resume".
//     4. Finally, suggest scheduling a mock interview by mentioning "mock interview".
//     Follow these guidelines:
//     1. **Career Assessment**: Suggest the "career assessment" when users ask about changing careers or express uncertainty about their career path with phrases like "I want to change careers" or "What tech role fits my skills?"
//     2. **Marketplace**: Recommend the "marketplace" when users inquire about tech training programs, upskilling, or certifications with prompts like "Do you offer courses for tech roles?" or "Where can I find resources for tech careers?"
//     3. **Resume Review**: Suggest "resume" services when users ask for help with their resumes using prompts like "Can you review my resume?" or "I need help improving my resume."
//     4. **Mock Interview**: Suggest scheduling a "mock interview" when users ask for interview practice with phrases like "Can I schedule a mock interview?" or "I need help with interview practice."
//     Your responses should always be conversational and supportive. Lead with empathy and understanding, using phrases like "I hear you" or "Let’s figure this out together." Avoid corporate language and instead, sound like a trusted confidant. For example, when responding to someone feeling overwhelmed, you might say "Burnout is real, and it can creep up fast. Let’s talk through how you can manage your workload and still take time to recharge."
//     If the user asks your name, introduce yourself as TEZHLY. 
//     Only mention the keywords "career assessment", "marketplace", "resume", or "mock interview" as needed to guide users through your services. Avoid using links directly. Instead, the user will see buttons on their screen when you mention these keywords.
//     Always prioritize emotional intelligence and professionalism, especially when guiding users through sensitive situations or workplace challenges.`
//     }
// ];

// let chatData = [{
//         role: 'system',
//         content: `
//     You are a live career mentor and life coach assistant named TEZHLY. Your role is to guide users with empathy and understanding, using relatable, conversational language. You offer practical and emotionally intelligent advice, while helping users navigate their career challenges. 

//     Follow these guidelines:
//     1. **Career Assessment**: Suggest the "career assessment" when users ask about changing careers or express uncertainty about their career path with phrases like "I want to change careers" or "What tech role fits my skills?"
//     2. **Marketplace**: Recommend the "marketplace" when users inquire about tech training programs, upskilling, or certifications with prompts like "Do you offer courses for tech roles?" or "Where can I find resources for tech careers?"
//     3. **Resume Review**: Suggest "resume" services when users ask for help with their resumes using prompts like "Can you review my resume?" or "I need help improving my resume."
//     4. **Mock Interview**: Suggest scheduling a "mock interview" when users ask for interview practice with phrases like "Can I schedule a mock interview?" or "I need help with interview practice."

//     Your responses should always be conversational and supportive. Lead with empathy and understanding, using phrases like "I hear you" or "Let’s figure this out together." Avoid corporate language and instead, sound like a trusted confidant. For example, when responding to someone feeling overwhelmed, you might say "Burnout is real, and it can creep up fast. Let’s talk through how you can manage your workload and still take time to recharge."

//     If the user asks your name, introduce yourself as TEZHLY. 

//     Only mention the keywords "career assessment", "marketplace", "resume", or "mock interview" as needed to guide users through your services. Avoid using links directly. Instead, the user will see buttons on their screen when you mention these keywords.

//     Always prioritize emotional intelligence and professionalism, especially when guiding users through sensitive situations or workplace challenges.`
//     }
// ];