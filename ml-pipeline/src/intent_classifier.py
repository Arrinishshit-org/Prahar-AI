"""
Intent Classifier for ReAct Agent

This module implements an intent classification system using BERT/DistilBERT
to classify user queries into actionable intents and extract entities.

Intent Categories:
- scheme_search: User looking for schemes matching criteria
- eligibility_check: User wants to know if they qualify for a scheme
- application_info: User needs application process details
- deadline_query: User asking about scheme deadlines
- profile_update: User wants to modify their profile
- general_question: General inquiry about schemes or platform
- nudge_preferences: User configuring notification settings

Entity Types:
- location: Geographic location (state, district)
- income: Income-related information
- occupation: Job or occupation type
- age: Age-related information
- scheme_name: Name of a specific scheme
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    pipeline
)
import numpy as np
import re


class Intent(str, Enum):
    """Intent categories for user queries"""
    SCHEME_SEARCH = 'scheme_search'
    ELIGIBILITY_CHECK = 'eligibility_check'
    APPLICATION_INFO = 'application_info'
    DEADLINE_QUERY = 'deadline_query'
    PROFILE_UPDATE = 'profile_update'
    GENERAL_QUESTION = 'general_question'
    NUDGE_PREFERENCES = 'nudge_preferences'


@dataclass
class Entity:
    """Extracted entity from user query"""
    type: str  # location, income, occupation, age, scheme_name
    value: str
    confidence: float


@dataclass
class IntentResult:
    """Result of intent classification"""
    primary_intent: Intent
    secondary_intents: List[Intent]
    confidence: float
    entities: List[Entity]


class IntentClassifier:
    """
    Intent classifier using BERT/DistilBERT for query classification
    and entity extraction.
    """
    
    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        model_path: Optional[str] = None
    ):
        """
        Initialize the intent classifier.
        
        Args:
            model_name: Base model to use (default: distilbert-base-uncased)
            model_path: Path to fine-tuned model (if available)
        """
        self.model_name = model_name
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Intent labels
        self.intent_labels = [intent.value for intent in Intent]
        self.num_labels = len(self.intent_labels)
        
        # Load or initialize model
        if model_path:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_path
            ).to(self.device)
        else:
            # Initialize with pre-trained model (not fine-tuned yet)
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=self.num_labels
            ).to(self.device)
        
        self.model.eval()
        
        # Entity extraction patterns
        self._init_entity_patterns()
    
    def _init_entity_patterns(self):
        """Initialize regex patterns for entity extraction"""
        # Indian states
        self.states = [
            'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar',
            'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh',
            'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra',
            'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
            'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
            'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi'
        ]
        
        # Income patterns
        self.income_pattern = re.compile(
            r'(?:income|earn|salary|revenue).*?(?:rs\.?|₹|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lakhs|thousand|k|cr|crore)?',
            re.IGNORECASE
        )
        
        # Age patterns
        self.age_pattern = re.compile(
            r'(?:age|aged|years old|year old)\s*(?:of|is)?\s*(\d+)',
            re.IGNORECASE
        )
        
        # Occupation keywords
        self.occupations = [
            'farmer', 'teacher', 'doctor', 'engineer', 'student', 'unemployed',
            'self-employed', 'business', 'worker', 'laborer', 'artisan',
            'craftsman', 'fisherman', 'weaver', 'driver', 'shopkeeper'
        ]
    
    def classify(
        self,
        query: str,
        context: Optional[Dict] = None
    ) -> IntentResult:
        """
        Classify user query into intent and extract entities.
        
        Args:
            query: User query text
            context: Optional conversation context
            
        Returns:
            IntentResult with primary intent, secondary intents, confidence, and entities
        """
        # Tokenize input
        inputs = self.tokenizer(
            query,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        # Get predictions
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)[0]
        
        # Get primary intent
        primary_idx = torch.argmax(probabilities).item()
        primary_intent = Intent(self.intent_labels[primary_idx])
        confidence = probabilities[primary_idx].item()
        
        # Get secondary intents (confidence > 0.2)
        secondary_intents = []
        for idx, prob in enumerate(probabilities):
            if idx != primary_idx and prob.item() > 0.2:
                secondary_intents.append(Intent(self.intent_labels[idx]))
        
        # Extract entities
        entities = self.extract_entities(query)
        
        return IntentResult(
            primary_intent=primary_intent,
            secondary_intents=secondary_intents,
            confidence=confidence,
            entities=entities
        )
    
    def extract_entities(self, query: str) -> List[Entity]:
        """
        Extract entities from user query.
        
        Args:
            query: User query text
            
        Returns:
            List of extracted entities
        """
        entities = []
        query_lower = query.lower()
        
        # Extract location (states)
        for state in self.states:
            if state in query_lower:
                entities.append(Entity(
                    type='location',
                    value=state.title(),
                    confidence=0.9
                ))
                break
        
        # Extract income
        income_match = self.income_pattern.search(query)
        if income_match:
            income_value = income_match.group(1)
            entities.append(Entity(
                type='income',
                value=income_value,
                confidence=0.85
            ))
        
        # Extract age
        age_match = self.age_pattern.search(query)
        if age_match:
            age_value = age_match.group(1)
            entities.append(Entity(
                type='age',
                value=age_value,
                confidence=0.9
            ))
        
        # Extract occupation
        for occupation in self.occupations:
            if occupation in query_lower:
                entities.append(Entity(
                    type='occupation',
                    value=occupation.title(),
                    confidence=0.85
                ))
                break
        
        # Extract scheme name (simple heuristic - capitalized phrases)
        scheme_pattern = re.compile(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Scheme|Yojana|Programme|Program))\b')
        scheme_matches = scheme_pattern.findall(query)
        for scheme_name in scheme_matches:
            entities.append(Entity(
                type='scheme_name',
                value=scheme_name,
                confidence=0.8
            ))
        
        return entities
    
    def train(
        self,
        training_data: List[Tuple[str, str]],
        validation_data: Optional[List[Tuple[str, str]]] = None,
        epochs: int = 3,
        batch_size: int = 16,
        learning_rate: float = 2e-5
    ) -> Dict[str, float]:
        """
        Fine-tune the model on labeled training data.
        
        Args:
            training_data: List of (query, intent_label) tuples
            validation_data: Optional validation data
            epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate for optimizer
            
        Returns:
            Dictionary with training metrics
        """
        from torch.utils.data import Dataset, DataLoader
        from torch.optim import AdamW
        from tqdm import tqdm
        
        class IntentDataset(Dataset):
            def __init__(self, data, tokenizer, intent_labels):
                self.data = data
                self.tokenizer = tokenizer
                self.label_to_idx = {label: idx for idx, label in enumerate(intent_labels)}
            
            def __len__(self):
                return len(self.data)
            
            def __getitem__(self, idx):
                query, label = self.data[idx]
                encoding = self.tokenizer(
                    query,
                    truncation=True,
                    max_length=512,
                    padding='max_length',
                    return_tensors='pt'
                )
                return {
                    'input_ids': encoding['input_ids'].squeeze(),
                    'attention_mask': encoding['attention_mask'].squeeze(),
                    'labels': torch.tensor(self.label_to_idx[label])
                }
        
        # Create datasets
        train_dataset = IntentDataset(training_data, self.tokenizer, self.intent_labels)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        
        # Setup training
        self.model.train()
        optimizer = AdamW(self.model.parameters(), lr=learning_rate)
        
        # Training loop
        total_loss = 0
        for epoch in range(epochs):
            epoch_loss = 0
            for batch in tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}"):
                optimizer.zero_grad()
                
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    labels=labels
                )
                
                loss = outputs.loss
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
            
            avg_epoch_loss = epoch_loss / len(train_loader)
            total_loss += avg_epoch_loss
            print(f"Epoch {epoch+1} - Loss: {avg_epoch_loss:.4f}")
        
        self.model.eval()
        
        # Evaluate if validation data provided
        metrics = {'train_loss': total_loss / epochs}
        if validation_data:
            val_metrics = self.evaluate(validation_data)
            metrics.update(val_metrics)
        
        return metrics
    
    def evaluate(
        self,
        test_data: List[Tuple[str, str]]
    ) -> Dict[str, float]:
        """
        Evaluate model on test data.
        
        Args:
            test_data: List of (query, intent_label) tuples
            
        Returns:
            Dictionary with evaluation metrics (accuracy, precision, recall, f1)
        """
        from sklearn.metrics import accuracy_score, precision_recall_fscore_support
        
        predictions = []
        true_labels = []
        
        for query, true_label in test_data:
            result = self.classify(query)
            predictions.append(result.primary_intent.value)
            true_labels.append(true_label)
        
        # Calculate metrics
        accuracy = accuracy_score(true_labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels,
            predictions,
            average='weighted',
            zero_division=0
        )
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
    
    def save(self, path: str):
        """Save model and tokenizer to disk"""
        self.model.save_pretrained(path)
        self.tokenizer.save_pretrained(path)
    
    def load(self, path: str):
        """Load model and tokenizer from disk"""
        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.model = AutoModelForSequenceClassification.from_pretrained(path).to(self.device)
        self.model.eval()
