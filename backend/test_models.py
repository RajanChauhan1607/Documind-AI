import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

load_dotenv()

try:
    print("Testing LangChain Groq Chat connection with your new key...")
    llm = ChatGroq(
        model_name="llama-3.1-8b-instant",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY")
    )
    
    response = llm.invoke([
        HumanMessage(content="Hello Groq! Can you read me? If so, respond with exactly 'Loud and clear!'.")
    ])
    print("\nSUCCESS! AI Response:")
    print("----------------------")
    print(response.content)
    print("----------------------")
except Exception as e:
    print("ERROR ->", e)
